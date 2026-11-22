import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { escapeHtml, sendInboxReply } from "@/lib/inbox-send";

const sendSchema = z.object({
  venueId: z.number().int().positive().nullable(),
  toEmail: z.string().email(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
  // Forwarding a thread to a third party (e.g. an accountant) reuses this route
  // but must NOT create a new inbox thread for that recipient -- persist:false
  // sends the email without inserting an outreachSends row.
  persist: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { venueId, toEmail, subject, body, persist } = parsed.data;

  if (!persist) {
    try {
      await sendOutreachEmail({ to: toEmail, subject, htmlContent: escapeHtml(body).replace(/\n/g, "<br>") });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "failed to send" }, { status: 502 });
    }
  }

  const result = await sendInboxReply({ venueId, toEmail, subject, body });
  if (!result.ok) return NextResponse.json({ error: "failed to send" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
