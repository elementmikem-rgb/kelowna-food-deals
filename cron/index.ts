import { fetchAndExtractText, fetchAndExtractTextViaBrowser, type FetchResult } from "./fetch";
import { scrapeCastanetEvents } from "./scrapeCastanet";
import { pruneAnalyticsEvents } from "@/lib/analytics";
import { normalizeText, hashText } from "./hash";
import { syncBookings } from "./booking-sync";
import { extractVenueContent } from "./extract";
import { discoverVenueLinks, isAutomatableUrl } from "./discover";
import { db, regions } from "@/db";
import { eq, sql } from "drizzle-orm";
import {
  getActiveVenues,
  getLastContentHash,
  logScrapeRun,
  markVenueStillCurrent,
  replaceVenueSpecials,
  replaceVenueEvents,
  replaceVenueMenuItems,
  mergeVenueSourceUrls,
  archiveExpiredMonthlySpecials,
} from "./upsert";

// A page whose extracted text comes back this short almost always means the
// real content is client-rendered (a SPA menu widget, a Canva/Issuu "view"
// embed) and a plain/headless fetch only ever saw the empty shell around it
// -- not that the page has genuinely little content. Logged so a thin
// extraction doesn't silently read as "this venue just has no menu."
const SUSPICIOUSLY_SHORT_PAGE_CHARS = 200;

// Every URL this venue could plausibly be scraped from: its main
// website/menuUrl plus anything discoverVenueLinks has found on prior runs
// (see runLinkDiscovery below). Social platforms are excluded even if they
// somehow ended up in sourceUrls -- those need the logged-in claude-in-chrome
// flow, not this unattended fetch.
function venueUrls(venue: { website: string | null; menuUrl: string | null; sourceUrls: string[] }): string[] {
  const all = [venue.menuUrl, venue.website, ...venue.sourceUrls].filter(
    (u): u is string => !!u
  );
  return Array.from(new Set(all)).filter(isAutomatableUrl);
}

// Overridable so a one-off manual run (e.g. clearing a backlog) can raise the
// ceiling without changing the daily scheduled cron's default budget. Now a
// global cap layered on top of each region's own configured tokenCeiling
// (Math.min(region.tokenCeiling, envOverride ?? Infinity)), not the only
// budget that exists -- see runScrapeCycle.
const parsedCronTokenCeiling = Number(process.env.CRON_TOKEN_CEILING);
const CRON_TOKEN_CEILING_OVERRIDE = Number.isFinite(parsedCronTokenCeiling)
  ? parsedCronTokenCeiling
  : undefined;
// Arbitrary fixed key for this cron's advisory lock -- any int works as long as it's
// stable across runs and not reused by another job sharing the same database.
const CRON_LOCK_KEY = 8_412_991;

// Fetches every URL for this venue (its main site plus any pages
// discoverVenueLinks has found -- see runLinkDiscovery) and concatenates
// them into one combined text, each page clearly delimited so
// extractVenueContent's evidence-quote matching still works against the
// right substring. A single fetch failure doesn't abort the others -- a
// venue with 3 known pages and 1 temporarily-down page still gets scraped
// from the other 2.
async function fetchAllPages(
  urls: string[],
  useBrowser: boolean
): Promise<{ combinedText: string; errors: string[] }> {
  const parts: string[] = [];
  const errors: string[] = [];
  for (const url of urls) {
    const result: FetchResult = useBrowser
      ? await fetchAndExtractTextViaBrowser(url)
      : await fetchAndExtractText(url);
    if (!result.ok) {
      errors.push(`${url}: ${result.error}`);
      continue;
    }
    if (result.text.trim().length < SUSPICIOUSLY_SHORT_PAGE_CHARS) {
      console.warn(
        `[${url}] fetched only ${result.text.trim().length} char(s) -- likely a JS-rendered widget/embed this plain fetch can't see through (e.g. a third-party ordering platform or Canva-style menu viewer)`
      );
    }
    parts.push(`=== PAGE: ${url} ===\n${result.text}`);
  }
  return { combinedText: parts.join("\n\n"), errors };
}

export async function processVenue(
  venue: {
    id: number;
    name: string;
    website: string | null;
    menuUrl: string | null;
    sourceUrls: string[];
    requiresBrowser: boolean;
  },
  regionId: number
): Promise<{ tokensUsed: number }> {
  const urls = venueUrls(venue);
  if (urls.length === 0) {
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

  const { combinedText, errors } = await fetchAllPages(urls, venue.requiresBrowser);
  if (!combinedText) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      error: errors.join("; ") || "all page fetches failed",
    });
    console.error(`[${venue.name}] all ${urls.length} page fetch(es) failed: ${errors.join("; ")}`);
    return { tokensUsed: 0 };
  }
  if (errors.length > 0) {
    console.warn(`[${venue.name}] ${errors.length}/${urls.length} page fetch(es) failed: ${errors.join("; ")}`);
  }

  const normalized = normalizeText(combinedText);
  const hash = hashText(normalized);
  const previousHash = await getLastContentHash(venue.id);
  // Every scraped page's own URL, joined -- kept as one string since
  // specials/events/menuItems are still reconciled per-venue in one batch,
  // not per-page (see replaceVenueSpecials et al.), so there's no single
  // "the" source URL once a venue has more than one page.
  const sourceUrl = urls.join(", ");

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
    const { specials, events, menuItems, tokensUsed } = await extractVenueContent(normalized);
    tokensSpent = tokensUsed;
    await replaceVenueSpecials(venue.id, regionId, sourceUrl, specials);
    await replaceVenueEvents(venue.id, regionId, sourceUrl, events);
    await replaceVenueMenuItems(venue.id, sourceUrl, menuItems);
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: true,
      tokensUsed,
      error: null,
    });
    console.log(
      `[${venue.name}] changed, extracted ${specials.length} special(s), ${events.length} event(s), ${menuItems.length} menu item(s), ${tokensUsed} tokens`
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

// Weekly-only (see runScrapeCycle) pass that finds new candidate pages
// (specials/happy-hour/events/full-menu links) on each venue's own site and
// stores them into sourceUrls, so the nightly processVenue picks them up as
// just another URL to fetch. Pure discovery -- no Haiku calls, so its cost
// is only the extra homepage/sitemap fetches, not extraction tokens.
export async function runLinkDiscovery(
  venueList: { id: number; name: string; website: string | null; sourceUrls: string[] }[]
): Promise<void> {
  for (const venue of venueList) {
    if (!venue.website) continue;
    try {
      const known = [venue.website, ...venue.sourceUrls];
      const discovered = await discoverVenueLinks(venue.website, known);
      if (discovered.length > 0) {
        await mergeVenueSourceUrls(venue.id, discovered);
        console.log(`[${venue.name}] discovered ${discovered.length} new page(s): ${discovered.join(", ")}`);
      }
    } catch (err) {
      console.error(
        `[${venue.name}] link discovery failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
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
  const activeRegions = await db.select().from(regions).where(eq(regions.active, true));

  let aborted = false;

  for (const region of activeRegions) {
    const tokenCeiling = Math.min(region.tokenCeiling, CRON_TOKEN_CEILING_OVERRIDE ?? Infinity);
    const venueList = await getActiveVenues(region.id);
    console.log(
      `Starting scrape run for ${venueList.length} active venue(s) in region ${region.slug}`
    );

    // Sunday only: a site's own link structure rarely changes night to
    // night, so re-crawling every venue's homepage/sitemap every night would
    // be pure overhead for no benefit -- see runLinkDiscovery's own comment.
    if (new Date().getDay() === 0) {
      console.log(`Running weekly link discovery for region ${region.slug}...`);
      await runLinkDiscovery(venueList);
    }

    let totalTokens = 0;

    for (const venue of venueList) {
      if (totalTokens >= tokenCeiling) {
        aborted = true;
        console.error(
          `Token ceiling (${tokenCeiling}) reached for region ${region.slug} — aborting remaining venues starting at "${venue.name}"`
        );
        break;
      }
      const { tokensUsed } = await processVenue(venue, region.id);
      totalTokens += tokensUsed;
    }

    console.log(`Region ${region.slug} complete. Total tokens used: ${totalTokens}`);
  }

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

  try {
    const { archived } = await archiveExpiredMonthlySpecials();
    console.log(`Monthly specials: archived ${archived} past their monthlyThroughDate`);
  } catch (err) {
    console.error("Monthly special archival failed:", err instanceof Error ? err.message : err);
  }

  try {
    const { activated } = await syncBookings();
    console.log(`Bookings: activated ${activated} booking(s) starting today`);
  } catch (err) {
    console.error("Booking sync failed:", err instanceof Error ? err.message : err);
  }

  // NOT a failing exit: hitting the token ceiling is an expected, deliberate
  // stop (the rotating "least-recently-scraped first" order in getActiveVenues
  // means a different tail gets skipped each night, not the same venues every
  // time), and every other step above still ran to completion. Exiting 1 here
  // made Railway report a false "crashed" deploy -- and send a crash email --
  // on every single ordinary night this ceiling was reached.
  if (aborted) {
    console.warn("Run finished with venues skipped due to the token ceiling (not a failure).");
  }
}

// Only auto-run when this file is executed directly (the scheduled `npm run
// cron`) -- without this guard, a script that merely IMPORTS processVenue or
// runLinkDiscovery for a one-off targeted run would trigger this file's own
// module-load side effect of scraping every active venue in every region and
// then calling process.exit(), which is not what an importer asked for.
import { fileURLToPath } from "url";

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((err) => {
      console.error("Fatal error in scrape run:", err);
      process.exit(1);
    });
}
