import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, outreachSends, venues } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { getRegionById } from "@/lib/regions";

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

  // A reply must go out under the brand the venue was originally contacted as.
  // The admin's currently-selected scope can span several regions, so the venue's
  // own region is the only reliable answer; an unmatched thread (venueId null,
  // e.g. a sponsorship inquiry) has no venue to ask, and falls back to neutral.
  const [replyVenue] = venueId
    ? await db.select({ regionId: venues.regionId }).from(venues).where(eq(venues.id, venueId)).limit(1)
    : [];
  const replyRegion = replyVenue ? await getRegionById(replyVenue.regionId) : null;
  const senderName = replyRegion?.brandName;

  if (!persist) {
    try {
      await sendOutreachEmail({ to: toEmail, subject, htmlContent: htmlBody, senderName });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "failed to send" }, { status: 502 });
    }
  }

  // Every reply gets a persisted outbound copy now, venue-matched or not, so it
  // shows up in that thread's history in the admin inbox either way.
  const [sendRow] = await db
    .insert(outreachSends)
    .values({ venueId, toEmail, subject, htmlBody, status: "queued" })
    .returning({ id: outreachSends.id });

  try {
    const { messageId } = await sendOutreachEmail({ to: toEmail, subject, htmlContent: htmlBody, senderName });
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
