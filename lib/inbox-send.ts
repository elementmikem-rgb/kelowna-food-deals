import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db, outreachSends, inboundEmails } from "@/db";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { buildThreadingHeaders } from "@/lib/email-threading";

// Sends a hand-approved reply from the admin inbox and records it in the conversation. Used by the inbox send route
// and by approving a proposal. The caller has already confirmed with Mike.

// The composed reply is plain text, but it is sent as an HTML email. Without escaping, literal text like
// "<owner@venue.com>" or "fish & chips <$10" is silently swallowed by the recipient's mail client.
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendInboxReply(args: {
  venueId: number | null;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { venueId, toEmail, subject, body } = args;
  const htmlBody = escapeHtml(body).replace(/\n/g, "<br>");

  // Thread the reply under the venue's newest inbound message that has a stored Message-ID, matching the same
  // thread the inbox shows: by venue, or by sender address for an unmatched sender.
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

  // Every reply gets a persisted outbound copy, venue-matched or not, so it shows up in that thread's history.
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
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(outreachSends).set({ status: "failed", errorMessage: message }).where(eq(outreachSends.id, sendRow.id));
    return { ok: false, error: message };
  }
}
