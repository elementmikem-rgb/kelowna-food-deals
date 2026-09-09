import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, inboundEmails, outreachSends } from "@/db";
import { eq } from "drizzle-orm";
import { sendReportEmail } from "@/lib/brevo";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { getCurrentRegion } from "@/lib/regions";

const inquirySchema = z.object({
  name: z.string().trim().min(1).max(200),
  business: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(300),
  message: z.string().trim().min(1).max(2000),
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const { ok: withinLimit } = await checkRateLimit(req, "sponsor-inquiry", 5, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many inquiries, try again later" }, { status: 429 });
  }

  const parsed = inquirySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }
  const { name, business, email, message } = parsed.data;

  // Land it in the same inbound queue a real email reply would -- venueId null
  // puts it in an "unmatched sender" thread, which the admin inbox and reply
  // flow already handle end-to-end with no further changes needed.
  await db.insert(inboundEmails).values({
    venueId: null,
    fromEmail: email,
    fromName: `${name} — ${business}`,
    subject: "Sponsorship inquiry",
    textBody: message,
  });

  // The inquiry arrived on one region's domain, so the reply has to come back
  // under that region's name -- a Penticton business asking about advertising
  // was previously answered by, and signed off from, Kelowna.
  const region = await getCurrentRegion();
  const brand = region.brandName;

  const autoReplySubject = `Thanks for reaching out — ${brand}`;
  const autoReplyHtml = [
    `<p>Hi ${escapeHtml(name)},</p>`,
    `<p>Thanks for your interest in advertising with ${escapeHtml(brand)}! We've got your message and will follow up soon.</p>`,
    "<p>For reference, here's what you sent us:</p>",
    `<blockquote>${escapeHtml(message).replace(/\n/g, "<br>")}</blockquote>`,
    `<p>Talk soon,<br>${escapeHtml(brand)}</p>`,
  ].join("\n");

  // Logged as an outbound send (venueId null, same as an admin's manual reply to
  // an unmatched sender) so the auto-reply shows up in this thread's history in
  // the admin inbox, not just in the business's own mailbox.
  const [sendRow] = await db
    .insert(outreachSends)
    .values({ venueId: null, toEmail: email, subject: autoReplySubject, htmlBody: autoReplyHtml, status: "queued" })
    .returning({ id: outreachSends.id });

  // Two independent notifications -- a failure in either shouldn't block the other,
  // and neither should fail the request: the inquiry is already safely persisted
  // above, so a flaky send here is a delivery hiccup, not a lost inquiry.
  const [notifyResult, autoReplyResult] = await Promise.allSettled([
    sendReportEmail({
      senderName: brand,
      subject: `Sponsorship inquiry: ${business}`,
      textContent: [
        `From: ${name} (${business})`,
        `Email: ${email}`,
        "",
        message,
        "",
        "Reply from the admin inbox to respond.",
      ].join("\n"),
    }),
    sendOutreachEmail({ to: email, subject: autoReplySubject, htmlContent: autoReplyHtml, senderName: brand }),
  ]);

  if (notifyResult.status === "rejected") {
    console.error("Sponsor inquiry notification email failed:", notifyResult.reason);
  }
  if (autoReplyResult.status === "fulfilled") {
    await db
      .update(outreachSends)
      .set({ status: "sent", brevoMessageId: autoReplyResult.value.messageId, sentAt: new Date() })
      .where(eq(outreachSends.id, sendRow.id));
  } else {
    console.error("Sponsor inquiry auto-reply failed:", autoReplyResult.reason);
    await db
      .update(outreachSends)
      .set({ status: "failed", errorMessage: String(autoReplyResult.reason) })
      .where(eq(outreachSends.id, sendRow.id));
  }

  return NextResponse.json({ ok: true });
}
