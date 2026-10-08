// Sends first-contact outreach (lib/outreach-send.ts's sendVenueOutreachEmail --
// same template, same tracking, same "already sent" guard as the admin panel's
// one-at-a-time Send button) only to venues currently inside their OWN region's
// morning send window, not everyone at once.
//
// Why this exists: Canada spans multiple timezones (Pacific through Atlantic/
// Newfoundland), so "send outreach at 9:30am" can't mean one fixed clock time --
// Quebec hits 9:30am local about 3 hours before BC does. This script is meant to
// run on a short recurring schedule (Railway cron, every ~15-20 min) rather than
// once a day; each run only picks up venues whose PROVINCE's local clock (see
// provinces.timezone) is inside the window right now, and relies on
// sendVenueOutreachEmail's own "already sent" check (via outreach_sends) to
// naturally stop re-sending to a venue once it's gone out -- no separate
// "sent today" tracking needed, this is a one-time first-contact campaign.
//
// DRY_RUN=1 (default) only prints who's in-window right now without sending.
// DRY_RUN=0 actually sends.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, venues, outreachSends, regions, provinces } from "@/db";
import { and, eq, isNull, notExists, sql } from "drizzle-orm";
import { sendVenueOutreachEmail } from "@/lib/outreach-send";

const DRY_RUN = process.env.DRY_RUN !== "0";

// Local-time-of-day window (minutes since midnight) a venue must currently be in
// to be sent to this run. 9:15-10:15 local -- wide enough that a 15-20 min cron
// cadence can't skip a timezone between two runs (window >= cron interval +
// margin), narrow enough to still read as "morning," not "any time today."
const WINDOW_START_MIN = 9 * 60 + 15;
const WINDOW_END_MIN = 10 * 60 + 15;

// Same courtesy pacing send-first-round-outreach.ts uses -- not a CASL
// requirement (that's about consent/content, not pacing), just not firing
// hundreds of requests at Brevo back-to-back or looking like a spam burst to
// receiving mail servers. Toronto alone (the biggest single timezone in this
// pool, ~1,400 venues) still finishes a full window's worth in well under 10
// minutes at this rate.
const DELAY_MS = 400;

// Caps how many sends ONE run will do, even if an entire large timezone (e.g.
// America/Toronto) is in-window at once -- spreads a big zone's batch across
// consecutive cron fires within the same window instead of one run blasting
// everyone the instant the window opens. Safe to cap: "already sent" exclusion
// means nothing is skipped or duplicated across runs, a capped run's leftover
// venues are just picked up by the next fire a few minutes later.
const MAX_SENDS_PER_RUN = 400;

// Arbitrary fixed advisory-lock key, distinct from cron/index.ts's 8_412_991 --
// stable across runs, not reused by another job sharing this database.
const LOCK_KEY = 8_412_992;

function minutesSinceMidnightInZone(timeZone: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

async function main() {
  const [{ locked }] = await db.execute<{ locked: boolean }>(
    sql`select pg_try_advisory_lock(${LOCK_KEY}) as locked`
  );
  if (!locked) {
    console.error("Another timezone-outreach run already holds the lock -- exiting.");
    process.exitCode = 1;
    return;
  }

  try {
    const now = new Date();

    // Same base eligibility as send-first-round-outreach.ts (active, has a real
    // contact email, not unsubscribed), plus each venue's province timezone for
    // the window check below. The "never contacted" check is by EMAIL ADDRESS,
    // not venue row: a chain (The Keg, Plaza Premium) or a near-duplicate scraped
    // entry (e.g. "Crown and Beaver Pub" / "Crown & Beaver Pub" -- different
    // venue rows, identical real-world business/inbox) can have two different
    // venues.id sharing one contactEmail. Checking only THIS venue's id against
    // outreach_sends would let both rows independently qualify as "never sent"
    // and double-email the same real inbox -- confirmed live 2026-10-07: 96
    // email addresses shared by 2+ eligible venue rows (127 would-be duplicate
    // sends) in this exact batch. Matching on toEmail instead means once ANY
    // venue sharing that address has a successful send logged, every other venue
    // row with that same address is permanently excluded too.
    const targets = await db
      .select({
        id: venues.id,
        name: venues.name,
        email: venues.contactEmail,
        timezone: provinces.timezone,
      })
      .from(venues)
      .innerJoin(regions, eq(venues.regionId, regions.id))
      .innerJoin(provinces, eq(regions.provinceId, provinces.id))
      .where(
        and(
          eq(venues.active, true),
          sql`${venues.contactEmail} is not null and ${venues.contactEmail} <> ''`,
          isNull(venues.unsubscribedAt),
          notExists(
            db
              .select({ id: outreachSends.id })
              .from(outreachSends)
              .where(
                and(
                  sql`lower(${outreachSends.toEmail}) = lower(${venues.contactEmail})`,
                  eq(outreachSends.status, "sent")
                )
              )
          )
        )
      )
      .orderBy(venues.id);

    // Second layer: within THIS run, collapse to one venue per unique email --
    // two never-before-contacted rows sharing an email both pass the SQL check
    // above (neither has a "sent" row yet), so without this, both would be sent
    // to in the same run before either's send lands in outreach_sends. Keeps the
    // first (lowest venue id) per email; arbitrary but deterministic.
    const seenEmails = new Set<string>();
    const dedupedTargets = targets.filter((v) => {
      const key = v.email!.toLowerCase().trim();
      if (seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    });
    if (dedupedTargets.length < targets.length) {
      console.log(
        `Collapsed ${targets.length - dedupedTargets.length} duplicate-email venue row(s) within this run's candidate list.`
      );
    }

    const inWindow = dedupedTargets.filter((v) => {
      const minutes = minutesSinceMidnightInZone(v.timezone, now);
      return minutes >= WINDOW_START_MIN && minutes < WINDOW_END_MIN;
    });

    console.log(
      `${dedupedTargets.length} total eligible venue(s) (post-dedup); ${inWindow.length} currently inside their local 9:15-10:15am window.`
    );

    if (inWindow.length === 0) {
      console.log("Nothing to do this run.");
      return;
    }

    const batch = inWindow.slice(0, MAX_SENDS_PER_RUN);
    if (inWindow.length > batch.length) {
      console.log(
        `Capping this run to ${MAX_SENDS_PER_RUN} send(s); remaining ${inWindow.length - batch.length} will be picked up by a later run still inside the window.`
      );
    }

    if (DRY_RUN) {
      for (const v of batch) {
        console.log(`  [would send] ${v.name} (${v.timezone})`);
      }
      console.log(`\n=== DRY RUN -- would send: ${batch.length} ===`);
      return;
    }

    let sent = 0;
    let failed = 0;
    for (const v of batch) {
      const result = await sendVenueOutreachEmail(v.id);
      if (result.ok) {
        sent++;
        console.log(`[${v.id}] ${v.name} (${v.timezone}): sent`);
      } else {
        failed++;
        console.warn(`[${v.id}] ${v.name} (${v.timezone}): FAILED - ${result.reason}`);
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    console.log(`\n=== Done. Sent ${sent}, failed ${failed}. ===`);
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_KEY})`);
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("Fatal error in timezone outreach run:", err);
    process.exit(1);
  });
