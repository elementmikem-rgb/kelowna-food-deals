import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues, outreachSends } from "@/db";
import { eq, and } from "drizzle-orm";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { isAdminAuthed } from "@/lib/admin-auth";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { buildVenueVerifyUrl } from "@/lib/venue-verify";
import { getRegionById } from "@/lib/regions";

const sendSchema = z.object({ venueId: z.number().int().positive() });

// Inline styles + table layout throughout -- Outlook and older webmail clients strip
// <style> blocks and ignore modern CSS, so anything that has to render consistently
// (brand colors, the logo band, the button) is styled inline on the element itself.
// Colors/fonts here are pulled straight from app/globals.css's --accent/--background/
// --foreground tokens and the Fraunces/Karla type pairing, so the email actually reads
// as the same brand as the site instead of a bare-text fallback.
function buildOutreachHtml(
  venueName: string,
  venueId: number,
  unsubscribeUrl: string,
  mailingAddress: string,
  regionSlug: string,
  verifyUrl: string,
  brandName: string
): string {
  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  const venueUrl = `${siteUrl}/${regionSlug}/venues/${venueId}`;
  const advertiseUrl = `${siteUrl}/${regionSlug}/advertise`;
  const logoUrl = `${siteUrl}/icons/icon-192.png`;

  const BG = "#f4ecd8";
  const CARD = "#fffaf0";
  const FG = "#2a2818";
  const MUTED = "#6b654e";
  const ACCENT = "#c14a1f";
  const ACCENT_DIM = "#8f3315";
  const BORDER = "#e4d9bb";

  return `
<div style="background:${BG};padding:32px 16px;font-family:Georgia,'Times New Roman',serif;white-space:normal;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;white-space:normal;">
    <tr>
      <td style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img src="${logoUrl}" width="40" height="40" alt="${brandName}" style="display:block;border-radius:50%;">
            </td>
            <td style="vertical-align:middle;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${FG};font-weight:700;">${brandName}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${FG};">
        <p style="margin:0 0 16px;">Hey there,</p>
        <p style="margin:0 0 16px;">I run ${brandName} — a site that tracks happy hours and food/drink deals
        around the area. I've got <strong>${venueName}</strong> listed here:</p>
        <p style="margin:0 0 20px;">
          <a href="${venueUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">View your listing</a>
        </p>
        <p style="margin:0 0 16px;">That's built from what I could find on your site, but I'd rather double-check with you
        than guess wrong.</p>
        <p style="margin:0 0 20px;">
          <a href="${verifyUrl}" style="display:inline-block;background:${ACCENT_DIM};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Confirm your specials are accurate</a>
        </p>
        <p style="margin:0 0 16px;">If you've got specials or events that
        aren't on your website but you'd want people to know about, just reply here and I'll add
        them.</p>
        <p style="margin:0 0 16px;">Separately — if you'd ever want your listing to pin to the top of the homepage, or
        push a specific special or seasonal menu, there's a paid option for that too:
        <a href="${advertiseUrl}" style="color:${ACCENT_DIM};">${advertiseUrl}</a>. No pressure either way, just flagging it's there.</p>
        <p style="margin:24px 0 0;">Thanks,<br>Mike</p>
      </td>
    </tr>
    <tr>
      <td style="padding-top:20px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};line-height:1.6;">
        ${mailingAddress}<br>
        Don't want emails like this? <a href="${unsubscribeUrl}" style="color:${MUTED};">Unsubscribe</a>.
      </td>
    </tr>
  </table>
</div>
  `;
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
      regionId: venues.regionId,
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

  const region = await getRegionById(venue.regionId);
  if (!region) {
    return NextResponse.json({ error: "venue has no valid region" }, { status: 500 });
  }
  // CASL requires a valid mailing address in every commercial email. regions.mailingAddress
  // is NOT NULL in the schema, so every region that can exist already has one.
  const mailingAddress = region.mailingAddress;

  const [alreadySent] = await db
    .select({ id: outreachSends.id })
    .from(outreachSends)
    .where(and(eq(outreachSends.venueId, venue.id), eq(outreachSends.status, "sent")))
    .limit(1);
  if (alreadySent) {
    return NextResponse.json({ error: "already sent outreach to this venue" }, { status: 409 });
  }

  const subject = `Quick one about ${venue.name} on ${region.brandName}`;
  const unsubscribeUrl = buildUnsubscribeUrl(venue.id);
  const verifyUrl = buildVenueVerifyUrl(venue.id, region.slug);
  const htmlBody = buildOutreachHtml(
    venue.name,
    venue.id,
    unsubscribeUrl,
    mailingAddress,
    region.slug,
    verifyUrl,
    region.brandName
  );

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
      senderName: region.brandName,
      // Only the legacy regions have a real reply.{domain} inbound-email
      // webhook wired up in Brevo (see project memory: Photaro/Kelowna
      // Specials Brevo webhook setup). A region with no domain of its own
      // has no such inbox yet -- replies fall back to a real mailbox
      // instead of silently pointing at a Brevo address nothing monitors.
      // Wiring a shared reply.todaystab.com inbox is a real follow-up, not
      // something to invent a working address for here.
      replyTo: region.domain ? `reply@reply.${region.domain}` : (process.env.REPORT_EMAIL_TO ?? "element.mikem@gmail.com"),
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
