import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails } from "@/db";
import { eq } from "drizzle-orm";
import { sendOutreachEmail } from "@/lib/outreach-email";

const replySchema = z.object({
  inboundEmailId: z.number().int().positive(),
  replyText: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const [original] = await db
    .select()
    .from(inboundEmails)
    .where(eq(inboundEmails.id, parsed.data.inboundEmailId))
    .limit(1);

  if (!original) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const subject = original.subject?.startsWith("Re:")
    ? original.subject
    : `Re: ${original.subject ?? "Your message"}`;

  try {
    await sendOutreachEmail({
      to: original.fromEmail,
      subject,
      htmlContent: parsed.data.replyText.replace(/\n/g, "<br>"),
    });
    await db
      .update(inboundEmails)
      .set({ read: true })
      .where(eq(inboundEmails.id, original.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reply send failed:", err);
    return NextResponse.json({ error: "failed to send" }, { status: 502 });
  }
}
