import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, outreachSends } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sendOutreachEmail } from "@/lib/outreach-email";

const sendSchema = z.object({
  venueId: z.number().int().positive().nullable(),
  toEmail: z.string().email(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { venueId, toEmail, subject, body } = parsed.data;
  const htmlBody = body.replace(/\n/g, "<br>");

  // Only venue-matched threads get a persisted outbound copy (outreachSends.venueId
  // is NOT NULL) — a reply to an unmatched sender still sends, just isn't archived.
  const sendRow = venueId
    ? (
        await db
          .insert(outreachSends)
          .values({ venueId, toEmail, subject, htmlBody, status: "queued" })
          .returning({ id: outreachSends.id })
      )[0]
    : null;

  try {
    const { messageId } = await sendOutreachEmail({ to: toEmail, subject, htmlContent: htmlBody });
    if (sendRow) {
      await db
        .update(outreachSends)
        .set({ status: "sent", brevoMessageId: messageId, sentAt: new Date() })
        .where(eq(outreachSends.id, sendRow.id));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (sendRow) {
      await db
        .update(outreachSends)
        .set({ status: "failed", errorMessage: message })
        .where(eq(outreachSends.id, sendRow.id));
    }
    return NextResponse.json({ error: "failed to send" }, { status: 502 });
  }
}
