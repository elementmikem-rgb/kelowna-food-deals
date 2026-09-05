import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues, outreachSends } from "@/db";
import { eq, and } from "drizzle-orm";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { isAdminAuthed } from "@/lib/admin-auth";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";

const sendSchema = z.object({ venueId: z.number().int().positive() });

function buildOutreachHtml(venueName: string, venueId: number, unsubscribeUrl: string, mailingAddress: string): string {
  const venueUrl = `https://kelownafooddeals.shop/venues/${venueId}`;
  return `
    <p>Hey there,</p>
    <p>I run Kelowna Food Deals — a site that tracks happy hours and food/drink deals
    around Kelowna. I've got <strong>${venueName}</strong> listed here:</p>
    <p><a href="${venueUrl}">${venueUrl}</a></p>
    <p>That's built from what I could find on your site, but I'd rather double-check with you
    than guess wrong. Does everything look right? And if you've got specials or events that
    aren't on your website but you'd want people to know about, just reply here and I'll add
    them.</p>
    <p>Thanks,<br>Mike</p>
    <hr style="margin-top:24px;border:none;border-top:1px solid #ddd;">
    <p style="font-size:12px;color:#888;">
      ${mailingAddress}<br>
      Don't want emails like this? <a href="${unsubscribeUrl}">Unsubscribe</a>.
    </p>
  `;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // CASL requires a valid mailing address in every commercial email; fail closed rather
  // than send a non-compliant message if this hasn't been configured.
  const mailingAddress = process.env.OUTREACH_MAILING_ADDRESS;
  if (!mailingAddress) {
    return NextResponse.json(
      { error: "OUTREACH_MAILING_ADDRESS is not configured -- required for CASL compliance" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const [venue] = await db
    .select({
      id: venues.id,
      name: venues.name,
      contactEmail: venues.contactEmail,
      unsubscribedAt: venues.unsubscribedAt,
    })
    .from(venues)
    .where(eq(venues.id, parsed.data.venueId))
    .limit(1);

  if (!venue || !venue.contactEmail) {
    return NextResponse.json({ error: "venue has no contact email on file" }, { status: 400 });
  }
  if (venue.unsubscribedAt) {
    return NextResponse.json({ error: "venue has unsubscribed from outreach email" }, { status: 400 });
  }

  const [alreadySent] = await db
    .select({ id: outreachSends.id })
    .from(outreachSends)
    .where(and(eq(outreachSends.venueId, venue.id), eq(outreachSends.status, "sent")))
    .limit(1);
  if (alreadySent) {
    return NextResponse.json({ error: "already sent outreach to this venue" }, { status: 409 });
  }

  const subject = `Quick one about ${venue.name} on Kelowna Food Deals`;
  const unsubscribeUrl = buildUnsubscribeUrl(venue.id);
  const htmlBody = buildOutreachHtml(venue.name, venue.id, unsubscribeUrl, mailingAddress);

  const [sendRow] = await db
    .insert(outreachSends)
    .values({
      venueId: venue.id,
      toEmail: venue.contactEmail,
      subject,
      htmlBody,
      status: "queued",
    })
    .returning({ id: outreachSends.id });

  try {
    const { messageId } = await sendOutreachEmail({
      to: venue.contactEmail,
      subject,
      htmlContent: htmlBody,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
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
