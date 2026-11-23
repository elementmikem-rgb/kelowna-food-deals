// Reminder to claimed venue owners who still have their unused free-trial credit.
//
// SAFE BY DEFAULT: with no flags this only PRINTS who would get the email and writes a preview of each language to a
// folder. Nothing is sent unless --send is passed. A real send goes to real owners, so it also:
//   - skips anyone the address-level suppression rules cover (unsubscribed, blocked, bounced),
//   - skips a venue that already got this reminder, already spent credit, or no longer has a balance,
//   - sends in French for French regions, English otherwise,
//   - only sends while it is 9:00 to 11:00 in the recipient's own timezone (override: --ignore-time-window),
//   - waits between sends instead of bursting.
//
//   npm run send-credit-nudge                        dry run for everyone eligible
//   npm run send-credit-nudge -- --ids=474,358       limit to these venue ids
//   npm run send-credit-nudge -- --timezone=America/Vancouver
//   npm run send-credit-nudge -- --send              really send (only to those passing every check)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db, venues, venueOwners, venueOwnerVenues, outreachSends } from "../db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { sendOutreachEmail } from "../lib/outreach-email";
import { wrapOutreachHtml } from "../lib/outreach-send";
import { buildUnsubscribeUrl } from "../lib/unsubscribe";
import { getRegionById, getRegionContext } from "../lib/regions";
import { suppressionReason } from "../lib/suppression";
import { buildCreditNudge, creditNudgeFooter, tidyFirstName } from "../lib/credit-nudge-email";
import { inLocalWindow } from "../lib/local-window";

const MIN_DAYS_SINCE_CLAIM = 7;
const PAUSE_MS = 2000;

function arg(name: string): string | null {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const send = flag("send");
  const ignoreWindow = flag("ignore-time-window");
  const idsArg = arg("ids");
  const tzFilter = arg("timezone");
  const previewDir = arg("preview-dir") ?? join(process.env.TEMP ?? ".", "credit-nudge-preview");
  const venueIds = idsArg ? idsArg.split(",").map(Number) : null;

  // Eligible: claimed, still holding credit, never spent any, never sent this reminder, claimed a while ago.
  const rows = await db
    .select({
      venueId: venues.id,
      venueName: venues.name,
      regionId: venues.regionId,
      ownerName: venueOwners.name,
      ownerEmail: venueOwners.email,
      creditBalance: venues.creditBalance,
    })
    .from(venues)
    .innerJoin(venueOwnerVenues, eq(venueOwnerVenues.venueId, venues.id))
    .innerJoin(venueOwners, eq(venueOwners.id, venueOwnerVenues.venueOwnerId))
    .where(
      and(
        sql`${venues.creditBalance} > 0`,
        sql`${venues.unsubscribedAt} is null`,
        sql`${venues.claimedAt} <= now() - (${MIN_DAYS_SINCE_CLAIM} || ' days')::interval`,
        sql`not exists (select 1 from specials.credit_ledger l where l.venue_id = ${venues.id} and l.reason = 'spend')`,
        sql`not exists (select 1 from specials.outreach_sends x where x.venue_id = ${venues.id} and x.kind = 'credit_nudge')`,
        venueIds ? inArray(venues.id, venueIds) : undefined
      )
    );

  console.log(`${send ? "SENDING" : "DRY RUN"}: ${rows.length} eligible owner(s)\n`);
  mkdirSync(previewDir, { recursive: true });
  const previewed = new Set<string>();
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    const region = await getRegionById(row.regionId);
    if (!region) {
      console.warn(`[${row.venueId}] ${row.venueName}: no region, skipped`);
      skipped++;
      continue;
    }
    const ctx = await getRegionContext(region);
    if (tzFilter && ctx.timezone !== tzFilter) continue;

    const lang: "en" | "fr" = region.language === "fr" ? "fr" : "en";
    const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
    const dashboardUrl = `${siteUrl}/owner/venue/${row.venueId}#promote`;
    const unsubscribeUrl = buildUnsubscribeUrl(row.venueId);
    const firstName = tidyFirstName(row.ownerName.split(" ")[0]);
    const nudge = buildCreditNudge({ lang, firstName, venueName: row.venueName, dashboardUrl });
    const footer = creditNudgeFooter(lang, region.mailingAddress, unsubscribeUrl);
    const htmlContent = wrapOutreachHtml(nudge.html, footer.html, region.brandName, `${siteUrl}/icons/icon-192.png`);
    const textContent = `${nudge.text}\n\n--\n${footer.text}`;

    if (!previewed.has(lang)) {
      previewed.add(lang);
      writeFileSync(join(previewDir, `preview-${lang}.html`), `<!doctype html><meta charset="utf-8"><title>${nudge.subject}</title>${htmlContent}`);
      writeFileSync(join(previewDir, `preview-${lang}.txt`), `Subject: ${nudge.subject}\n\n${textContent}`);
    }

    const suppressed = await suppressionReason(row.ownerEmail);
    const inWindow = inLocalWindow(now, ctx.timezone);
    const status = suppressed ? `SKIP (${suppressed})` : send && !inWindow && !ignoreWindow ? `SKIP (outside 9-11 local, ${ctx.timezone})` : send ? "send" : "would send";
    console.log(`[${row.venueId}] ${row.venueName} | ${row.ownerEmail} | ${lang} | ${ctx.timezone} | ${status}`);

    if (!send || suppressed || (!inWindow && !ignoreWindow)) {
      if (send) skipped++;
      continue;
    }

    // Re-check right before sending: balance and a double-send guard against another run.
    const [fresh] = await db.select({ credit: venues.creditBalance }).from(venues).where(eq(venues.id, row.venueId));
    if (!fresh || fresh.credit <= 0) {
      console.log(`  -> balance changed, skipped`);
      skipped++;
      continue;
    }
    const [already] = await db
      .select({ id: outreachSends.id })
      .from(outreachSends)
      .where(and(eq(outreachSends.venueId, row.venueId), eq(outreachSends.kind, "credit_nudge")))
      .limit(1);
    if (already) {
      console.log(`  -> already sent, skipped`);
      skipped++;
      continue;
    }

    // Logged like the other outreach paths: a queued row first (its id tags the Brevo send), then sent or failed.
    const [sendRow] = await db
      .insert(outreachSends)
      .values({ venueId: row.venueId, kind: "credit_nudge", toEmail: row.ownerEmail, subject: nudge.subject, htmlBody: htmlContent, status: "queued" })
      .returning({ id: outreachSends.id });
    try {
      const { messageId } = await sendOutreachEmail({
        to: row.ownerEmail,
        subject: nudge.subject,
        htmlContent,
        textContent,
        senderName: region.brandName,
        replyTo: region.domain ? `reply@reply.${region.domain}` : `reply@reply.${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        tags: [`send-${sendRow.id}`],
      });
      await db.update(outreachSends).set({ status: "sent", brevoMessageId: messageId, sentAt: new Date() }).where(eq(outreachSends.id, sendRow.id));
      console.log(`  -> sent (${messageId})`);
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(outreachSends).set({ status: "failed", errorMessage: message }).where(eq(outreachSends.id, sendRow.id));
      console.error(`  -> FAILED: ${message}`);
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  console.log(`\n${send ? `Sent ${sent}, skipped ${skipped}.` : "Dry run only. Nothing was sent."} Previews are in ${previewDir}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
