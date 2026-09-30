// One-off batch: send the existing first-contact outreach email (the same
// template/logic the admin panel's one-at-a-time "Send" button uses --
// lib/outreach-send.ts's sendVenueOutreachEmail) to every eligible venue that
// has a contact_email on file and has never been sent outreach before. Real
// sends to real businesses -- run with: npm run send-first-round-outreach
import { db, venues, outreachSends } from "../db";
import { and, eq, isNull, notExists, sql } from "drizzle-orm";
import { sendVenueOutreachEmail } from "../lib/outreach-send";

// Space sends out a bit rather than firing 784 requests back to back -- not a
// CASL requirement here (that's about consent/content, not pacing), just
// good citizenship toward Brevo's API and toward not looking like a spam
// burst to receiving mail servers.
const DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const targets = await db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        sql`${venues.contactEmail} is not null and ${venues.contactEmail} <> ''`,
        isNull(venues.unsubscribedAt),
        notExists(
          db
            .select({ id: outreachSends.id })
            .from(outreachSends)
            .where(and(eq(outreachSends.venueId, venues.id), eq(outreachSends.status, "sent")))
        )
      )
    )
    .orderBy(venues.id);

  console.log(`Sending first-round outreach to ${targets.length} venues...`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (const v of targets) {
    const result = await sendVenueOutreachEmail(v.id);
    if (result.ok) {
      sent++;
      console.log(`[${v.id}] ${v.name}: sent`);
    } else if (result.reason?.includes("already sent")) {
      skipped++;
    } else {
      failed++;
      console.warn(`[${v.id}] ${v.name}: FAILED - ${result.reason}`);
    }

    if ((sent + skipped + failed) % 50 === 0) {
      const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
      console.log(`--- progress: ${sent + skipped + failed}/${targets.length}, sent ${sent}, failed ${failed}, ${elapsedMin}min elapsed ---`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. Sent ${sent}, skipped ${skipped} (already sent), failed ${failed}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
