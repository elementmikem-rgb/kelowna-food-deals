// One-off campaign runner for lib/outreach-weekend-email.ts. Paces sends across time
// (10-25s jitter between individual emails) and gates each send to a 9am-8pm window in
// THAT VENUE'S OWN timezone -- not Pacific, not whenever the script happens to be
// running -- so a Newfoundland venue never gets a cold email at what's 11pm for them
// just because it's still business hours out west. See feedback_outreach_930_local.md:
// never burst-send, the window gate must be per-recipient timezone. Safe to stop
// (Ctrl+C) and rerun later -- sendVenueWeekendEmail's own dedupe check (kind:
// "weekend_promo", status: "sent") means a rerun only ever sends to whoever's left.
import { db, venues, regions, provinces, outreachSends } from "../db";
import { sendVenueWeekendEmail } from "../lib/outreach-weekend-email";
import { sql, eq, and, notInArray } from "drizzle-orm";

// Cut further to 1-2s on 2026-10-03 at Mike's explicit request to clear the last ~665
// tonight. Kept a floor above 0 on purpose -- a true zero-delay burst from one sender
// is what actually gets an IP/domain flagged by spam filters, which would hurt every
// future send, not just this one. The per-recipient timezone window gate below is
// unchanged -- nobody gets this at 3am local just because the inter-send delay shrank.
const MIN_DELAY_MS = 1_000;
const MAX_DELAY_MS = 2_000;
const WINDOW_START_HOUR = 9;
// Widened from 20 (8pm) to 22 (10pm) on 2026-10-02 specifically to get the whole list
// out same-day -- still a real cutoff (nobody gets this at 2am their time), just a
// later one than the original 9am-8pm default. See feedback_outreach_930_local.md for
// why there's a cutoff at all; this is a deliberate one-time widening of it, not a
// removal.
// Widened again to 24 (midnight) on 2026-10-03 at Mike's explicit request to clear the
// final ~67 Atlantic/Newfoundland venues, which were only an hour or two past the old
// 10pm cutoff (not the middle of the night). One-time override for this last batch.
const WINDOW_END_HOUR = 24;
const RECHECK_IDLE_MS = 10 * 60 * 1000;

function currentLocalHour(timezone: string): number {
  return Number(new Date().toLocaleString("en-US", { timeZone: timezone, hour: "2-digit", hour12: false }));
}

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Already-sent venues (kind: "weekend_promo", status: "sent") are excluded at the
  // query level -- a restart must never re-walk the done portion of the list. An
  // earlier version relied solely on sendVenueWeekendEmail's own dedupe check, which
  // is correct but silent (no log line for a skip) and still burns a full paced delay
  // per already-sent venue, making a restart look stalled for minutes at a time.
  const alreadySent = db
    .select({ venueId: outreachSends.venueId })
    .from(outreachSends)
    .where(and(eq(outreachSends.kind, "weekend_promo"), eq(outreachSends.status, "sent")));

  const rows = await db
    .select({ id: venues.id, name: venues.name, timezone: provinces.timezone })
    .from(venues)
    .innerJoin(regions, eq(venues.regionId, regions.id))
    .innerJoin(provinces, eq(regions.provinceId, provinces.id))
    .where(
      and(
        sql`${venues.active} = true and ${venues.contactEmail} is not null and ${venues.unsubscribedAt} is null and ${venues.claimedAt} is null`,
        notInArray(venues.id, alreadySent)
      )
    );

  const queue = rows.slice();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  console.log(`Weekend promo: ${queue.length} eligible venues (already-sent excluded). Starting ${new Date().toISOString()}.`);

  while (queue.length > 0) {
    const idx = queue.findIndex((v) => {
      const h = currentLocalHour(v.timezone);
      return h >= WINDOW_START_HOUR && h < WINDOW_END_HOUR;
    });

    if (idx === -1) {
      console.log(`${queue.length} left, none in a ${WINDOW_START_HOUR}am-${WINDOW_END_HOUR > 12 ? WINDOW_END_HOUR - 12 : WINDOW_END_HOUR}pm local window right now -- rechecking in 10 min.`);
      await sleep(RECHECK_IDLE_MS);
      continue;
    }

    const venue = queue[idx];
    queue.splice(idx, 1);
    const outcome = await sendVenueWeekendEmail(venue.id);
    if (outcome.ok) {
      sent++;
      console.log(`[sent ${sent}, ${queue.length} left] ${venue.name}`);
    } else if (outcome.reason?.includes("already sent")) {
      skipped++;
      console.log(`[skip ${skipped}, ${queue.length} left] ${venue.name} -- already sent`);
    } else {
      failed++;
      console.log(`[FAILED] ${venue.name}: ${outcome.reason}`);
    }

    await sleep(randomDelay());
  }

  console.log(`Done ${new Date().toISOString()}. Sent: ${sent}, Failed: ${failed}, Already-sent skipped: ${skipped}.`);
}

main().then(() => process.exit(0));
