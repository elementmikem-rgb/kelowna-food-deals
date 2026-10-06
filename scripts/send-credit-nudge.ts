// One-off: nudge claimed venue owners who have unused free-trial credits and have
// never logged back in (or logged in once and never spent). Real send to real owners --
// run with: npm run send-credit-nudge -- --ids=474,358,... (comma-separated venue ids)
import { db, venues, venueOwners, venueOwnerVenues, creditLedger, outreachSends } from "../db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { sendOutreachEmail } from "../lib/outreach-email";
import { wrapOutreachHtml } from "../lib/outreach-send";
import { buildUnsubscribeUrl } from "../lib/unsubscribe";
import { getRegionById } from "../lib/regions";

const ACCENT = "#c14a1f";
const ACCENT_DIM = "#8f3315";
const MUTED = "#6b654e";

function buildBody(ownerFirstName: string, venueName: string, siteUrl: string, dashboardUrl: string): string {
  return `
    <p style="margin:0 0 16px;">Hey ${ownerFirstName},</p>
    <p style="margin:0 0 16px;">Quick one — since claiming <strong>${venueName}</strong>, you've got
    <strong>$10 in free credit</strong> sitting on your account, unused.</p>
    <p style="margin:0 0 16px;">Here's what it does: spend it on <strong>Featured</strong> (pins your
    listing to the top of the homepage) or <strong>Boost</strong> (puts one specific special or event
    front and center) — no card needed, it just comes off your balance. $10 covers a few days of
    either.</p>
    <p style="margin:0 0 20px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
      padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Use my credit</a>
    </p>
    <p style="margin:0 0 16px;">Takes about two minutes from your dashboard. No pressure if now's not
    the right time — it doesn't expire. Just didn't want you to miss it.</p>
    <p style="margin:24px 0 0;">Thanks,<br>Mike</p>
  `;
}

function buildText(ownerFirstName: string, venueName: string, dashboardUrl: string): string {
  return `Hey ${ownerFirstName},

Quick one -- since claiming ${venueName}, you've got $10 in free credit sitting on your account, unused.

Here's what it does: spend it on Featured (pins your listing to the top of the homepage) or Boost (puts one specific special or event front and center) -- no card needed, it just comes off your balance. $10 covers a few days of either.

Use your credit: ${dashboardUrl}

Takes about two minutes from your dashboard. No pressure if now's not the right time -- it doesn't expire. Just didn't want you to miss it.

Thanks,
Mike`;
}

async function main() {
  const idsArg = process.argv.find((a) => a.startsWith("--ids="));
  if (!idsArg) {
    console.error("usage: npm run send-credit-nudge -- --ids=1,2,3");
    process.exit(1);
  }
  const venueIds = idsArg.replace("--ids=", "").split(",").map(Number);

  const rows = await db
    .select({
      venueId: venues.id,
      venueName: venues.name,
      regionId: venues.regionId,
      ownerId: venueOwners.id,
      ownerName: venueOwners.name,
      ownerEmail: venueOwners.email,
      creditBalance: venues.creditBalance,
    })
    .from(venues)
    .innerJoin(venueOwnerVenues, eq(venueOwnerVenues.venueId, venues.id))
    .innerJoin(venueOwners, eq(venueOwners.id, venueOwnerVenues.venueOwnerId))
    .where(inArray(venues.id, venueIds));

  console.log(`Sending credit nudge to ${rows.length} owner(s)...`);

  for (const row of rows) {
    // Re-check balance right before sending -- an owner who spent credits between
    // list-building and send time shouldn't get a "you haven't used this" nudge.
    if (row.creditBalance <= 0) {
      console.log(`[${row.venueId}] ${row.venueName}: skipped, balance is ${row.creditBalance}`);
      continue;
    }

    const region = await getRegionById(row.regionId);
    if (!region) {
      console.warn(`[${row.venueId}] ${row.venueName}: no region found, skipped`);
      continue;
    }

    const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
    const dashboardUrl = `${siteUrl}/owner/venue/${row.venueId}#promote`;
    const logoUrl = `${siteUrl}/icons/icon-192.png`;
    const unsubscribeUrl = buildUnsubscribeUrl(row.venueId);
    const firstName = row.ownerName.split(" ")[0];

    const footer = `${region.mailingAddress}<br>
        Don't want emails like this? <a href="${unsubscribeUrl}" style="color:${MUTED};">Unsubscribe</a>.`;
    const footerText = `${region.mailingAddress}\nDon't want emails like this? Unsubscribe: ${unsubscribeUrl}`;

    const subject = `You've got $10 in credit waiting, ${row.venueName}`;
    const bodyHtml = buildBody(firstName, row.venueName, siteUrl, dashboardUrl);
    const bodyText = buildText(firstName, row.venueName, dashboardUrl);
    const htmlContent = wrapOutreachHtml(bodyHtml, footer, region.brandName, logoUrl);
    const textContent = `${bodyText}\n\n--\n${footerText}`;

    // Logged the same way lib/outreach-followup-email.ts and lib/outreach-weekend-email.ts
    // log theirs -- a "queued" row inserted before the send (so its id is available for
    // the Brevo tag), updated to "sent"/"failed" after. Without this the send still works,
    // but it's invisible to the admin inbox and gets no open/click tracking (confirmed
    // missing entirely for the 2026-10-06 run of this script, before this fix).
    const [sendRow] = await db
      .insert(outreachSends)
      .values({ venueId: row.venueId, kind: "credit_nudge", toEmail: row.ownerEmail, subject, htmlBody: htmlContent, status: "queued" })
      .returning({ id: outreachSends.id });

    try {
      const { messageId } = await sendOutreachEmail({
        to: row.ownerEmail,
        subject,
        htmlContent,
        textContent,
        senderName: region.brandName,
        replyTo: region.domain
          ? `reply@reply.${region.domain}`
          : `reply@reply.${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [`send-${sendRow.id}`],
      });
      await db.update(outreachSends).set({ status: "sent", brevoMessageId: messageId, sentAt: new Date() }).where(eq(outreachSends.id, sendRow.id));
      console.log(`[${row.venueId}] ${row.venueName} -> ${row.ownerEmail}: sent (${messageId})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(outreachSends).set({ status: "failed", errorMessage: message }).where(eq(outreachSends.id, sendRow.id));
      console.error(`[${row.venueId}] ${row.venueName} -> ${row.ownerEmail}: FAILED - ${message}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
