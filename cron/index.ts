import { fetchAndExtractText, fetchAndExtractTextViaBrowser } from "./fetch";
import { scrapeCastanetEvents } from "./scrapeCastanet";
import { pruneAnalyticsEvents } from "@/lib/analytics";
import { normalizeText, hashText } from "./hash";
import { extractVenueContent } from "./extract";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import {
  getActiveVenues,
  getLastContentHash,
  logScrapeRun,
  markVenueStillCurrent,
  replaceVenueSpecials,
  replaceVenueEvents,
} from "./upsert";

// Overridable so a one-off manual run (e.g. clearing a backlog) can raise the
// ceiling without changing the daily scheduled cron's default budget.
const TOKEN_CEILING = Number(process.env.CRON_TOKEN_CEILING) || 50_000;
// Arbitrary fixed key for this cron's advisory lock -- any int works as long as it's
// stable across runs and not reused by another job sharing the same database.
const CRON_LOCK_KEY = 8_412_991;

async function processVenue(venue: {
  id: number;
  name: string;
  website: string | null;
  menuUrl: string | null;
  requiresBrowser: boolean;
}): Promise<{ tokensUsed: number }> {
  const url = venue.menuUrl ?? venue.website;
  if (!url) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      error: "no website or menu_url configured",
    });
    console.error(`[${venue.name}] skipped: no website or menu_url configured`);
    return { tokensUsed: 0 };
  }

  const fetched = venue.requiresBrowser
    ? await fetchAndExtractTextViaBrowser(url)
    : await fetchAndExtractText(url);
  if (!fetched.ok) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      error: fetched.error,
    });
    console.error(`[${venue.name}] fetch failed: ${fetched.error}`);
    return { tokensUsed: 0 };
  }

  const normalized = normalizeText(fetched.text);
  const hash = hashText(normalized);
  const previousHash = await getLastContentHash(venue.id);

  if (previousHash === hash) {
    await markVenueStillCurrent(venue.id);
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: false,
      tokensUsed: 0,
      error: null,
    });
    console.log(`[${venue.name}] unchanged, skipped extraction`);
    return { tokensUsed: 0 };
  }

  // Captured outside the try: the Anthropic call can succeed (spending real
  // tokens) and a later step in the same block still throw. Logging 0 there
  // would hide that spend and stop TOKEN_CEILING from ever aborting a
  // runaway night whose failures all land after the API call.
  let tokensSpent = 0;
  try {
    const { specials, events, tokensUsed } = await extractVenueContent(normalized);
    tokensSpent = tokensUsed;
    await replaceVenueSpecials(venue.id, url, specials);
    await replaceVenueEvents(venue.id, url, events);
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: true,
      tokensUsed,
      error: null,
    });
    console.log(
      `[${venue.name}] changed, extracted ${specials.length} special(s) and ${events.length} event(s), ${tokensUsed} tokens`
    );
    return { tokensUsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logScrapeRun({
      venueId: venue.id,
      // null, not hash: recording the new hash here would make tomorrow's run see
      // previousHash === hash and skip extraction forever, permanently freezing this
      // venue on a single transient failure while it still reads as "verified today".
      contentHash: null,
      changed: true,
      tokensUsed: tokensSpent,
      error: `extraction failed: ${message}`,
    });
    console.error(
      `[${venue.name}] extraction failed after ${tokensSpent} token(s): ${message}`
    );
    return { tokensUsed: tokensSpent };
  }
}

async function main() {
  // Without this, two overlapping invocations (a slow run plus a new scheduled trigger)
  // both read the same "previous hash" for a venue, both conclude it changed, and each
  // archive-then-insert -- leaving two full sets of active specials/events live at once.
  const [{ locked }] = await db.execute<{ locked: boolean }>(
    sql`select pg_try_advisory_lock(${CRON_LOCK_KEY}) as locked`
  );
  if (!locked) {
    console.error("Another cron run already holds the lock -- exiting without scraping.");
    process.exitCode = 1;
    return;
  }

  try {
    await runScrapeCycle();
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${CRON_LOCK_KEY})`);
  }
}

async function runScrapeCycle() {
  const venueList = await getActiveVenues();
  console.log(`Starting scrape run for ${venueList.length} active venue(s)`);

  let totalTokens = 0;
  let aborted = false;

  for (const venue of venueList) {
    if (totalTokens >= TOKEN_CEILING) {
      aborted = true;
      console.error(
        `Token ceiling (${TOKEN_CEILING}) reached — aborting remaining venues starting at "${venue.name}"`
      );
      break;
    }
    const { tokensUsed } = await processVenue(venue);
    totalTokens += tokensUsed;
  }

  console.log(`Run complete. Total tokens used: ${totalTokens}`);

  try {
    const { inserted } = await scrapeCastanetEvents();
    console.log(`Castanet events: refreshed ${inserted} nightlife-adjacent event(s)`);
  } catch (err) {
    console.error("Castanet scrape failed:", err instanceof Error ? err.message : err);
  }

  try {
    const { deleted } = await pruneAnalyticsEvents();
    console.log(`Analytics: pruned ${deleted} event(s) older than the retention window`);
  } catch (err) {
    console.error("Analytics pruning failed:", err instanceof Error ? err.message : err);
  }

  if (aborted) {
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("Fatal error in scrape run:", err);
    process.exit(1);
  });
