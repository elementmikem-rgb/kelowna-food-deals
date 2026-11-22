import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, outreachSends, inboundEmails } from "@/db";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { buildThreadingHeaders } from "@/lib/email-threading";

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

// The composed reply is plain text typed by the admin, but it's sent as an HTML
// email. Without escaping, literal text like "<owner@venue.com>" or "fish & chips
// <$10" is silently swallowed by the recipient's mail client.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { venueId, toEmail, subject, body, persist } = parsed.data;
  const htmlBody = escapeHtml(body).replace(/\n/g, "<br>");

  if (!persist) {
    try {
      await sendOutreachEmail({ to: toEmail, subject, htmlContent: htmlBody });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "failed to send" }, { status: 502 });
    }
  }

  // Thread the reply under the venue's newest inbound message that has a
  // stored Message-ID (inboundEmails.brevoMessageId), matching the same thread
  // the inbox shows: by venue, or by sender address for an unmatched sender.
  // Not done for persist:false above, which is a forward to a third party.
  const [latestInbound] = await db
    .select({ messageId: inboundEmails.brevoMessageId, inReplyTo: inboundEmails.inReplyTo })
    .from(inboundEmails)
    .where(
      and(
        isNotNull(inboundEmails.brevoMessageId),
        venueId !== null
          ? eq(inboundEmails.venueId, venueId)
          : and(isNull(inboundEmails.venueId), eq(inboundEmails.fromEmail, toEmail.toLowerCase().trim()))
      )
    )
    .orderBy(desc(inboundEmails.receivedAt))
    .limit(1);
  const headers = buildThreadingHeaders(latestInbound ?? null);

  // Every reply gets a persisted outbound copy now, venue-matched or not, so it
  // shows up in that thread's history in the admin inbox either way.
  const [sendRow] = await db
    .insert(outreachSends)
    .values({ venueId, toEmail, subject, htmlBody, status: "queued", kind: "admin_reply" })
    .returning({ id: outreachSends.id });

  try {
    const { messageId } = await sendOutreachEmail({ to: toEmail, subject, htmlContent: htmlBody, headers });
    await db
      .update(outreachSends)
      .set({ status: "sent", brevoMessageId: messageId, sentAt: new Date() })
      .where(eq(outreachSends.id, sendRow.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(outreachSends)
      .set({ status: "failed", errorMessage: message })
      .where(eq(outreachSends.id, sendRow.id));
    return NextResponse.json({ error: "failed to send" }, { status: 502 });
  }
}
