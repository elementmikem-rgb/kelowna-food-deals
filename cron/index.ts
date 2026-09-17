import { fetchAndExtractText, fetchAndExtractTextViaBrowser, type FetchResult } from "./fetch";
import { scrapeCastanetEvents } from "./scrapeCastanet";
import { scrapeNowMediaEvents } from "./scrapeNowMedia";
import { scrape604NowEvents } from "./scrape604now";
import { pruneAnalyticsEvents } from "@/lib/analytics";
import { normalizeText, hashText } from "./hash";
import { syncBookings } from "./booking-sync";
import { extractVenueContent, truncatePageText } from "./extract";
import {
  submitExtractionBatch,
  pollBatchStatus,
  fetchBatchResults,
  estimateExtractionTokens,
  type BatchResultOutcome,
} from "./batchExtract";
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
  hasFreshMenuItems,
  getPendingExtractionBatches,
  createExtractionBatch,
  markExtractionBatchItemDone,
  markExtractionBatchResolved,
  type PendingBatch,
  type PendingBatchItem,
} from "./upsert";

// A menu changes far less often than daily specials/events -- re-extracting
// (and re-billing output tokens for) the whole menu on every single
// content-changed night mostly just re-pays for a near-identical block of
// output for no real freshness gain. A venue with menu items already
// verified within this window skips the MENU ITEMS section of the prompt
// entirely (see buildSystemPrompt in extract.ts) rather than asking for it
// and discarding the answer -- discarding still pays full output-token
// price for content it doesn't use.
const MENU_ITEMS_RECHECK_DAYS = 14;

// A page whose extracted text comes back this short almost always means the
// real content is client-rendered (a SPA menu widget, a Canva/Issuu "view"
// embed) and a plain/headless fetch only ever saw the empty shell around it
// -- not that the page has genuinely little content. Logged so a thin
// extraction doesn't silently read as "this venue just has no menu."
const SUSPICIOUSLY_SHORT_PAGE_CHARS = 200;

// Bounds a step that could otherwise hang the whole cron run forever (a
// browser launch or page operation with no timeout of its own) -- rejects
// with a plain Error after `ms` so the caller's try/catch logs it and moves
// on to the next step, instead of every later step silently never running.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

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
// Comma-separated region slugs (e.g. "calgary,edmonton") to scope a run to just those
// regions instead of every active region on the platform. Existed as a real gap until
// 2026-09-13: launching a new region previously meant `npm run cron` re-scraping the
// entire platform (every existing region too) just to reach the new one's venues -- see
// docs/ADDING_A_REGION.md's "cost control" note. Undefined/empty = every active region,
// the existing default behavior.
const CRON_REGIONS_FILTER = process.env.CRON_REGIONS
  ? new Set(process.env.CRON_REGIONS.split(",").map((s) => s.trim()).filter(Boolean))
  : undefined;
// "1"/"true" = only venues that have never been scraped at all (no scrape_runs row) --
// the exact set a brand-new region launch actually needs, skipping every already-known
// venue's re-check entirely rather than letting the content-hash skip do the (still
// non-zero) work of re-fetching each one to confirm nothing changed.
const CRON_NEVER_SCRAPED_ONLY = process.env.CRON_NEVER_SCRAPED_ONLY === "1" || process.env.CRON_NEVER_SCRAPED_ONLY === "true";
// Hard gate on an unscoped (every active region) run -- CRON_REGIONS alone only helps if
// whoever's running this remembers to set it, which is exactly what failed twice (North
// Okanagan 2026-09-10, the Alberta launch 2026-09-13): a bare `npm run cron` silently did
// the expensive full-platform sweep both times. Only the scheduled nightly cron (Railway's
// separate "cron" service, which has this var set on itself specifically -- not on "web",
// not in any local .env) is allowed to run unscoped; any manual invocation without
// CRON_REGIONS must now also pass this explicitly, which is exactly the deliberate,
// hard-to-do-by-accident step a stale doc reminder never was.
const CRON_ALLOW_FULL_SWEEP = process.env.CRON_ALLOW_FULL_SWEEP === "1" || process.env.CRON_ALLOW_FULL_SWEEP === "true";
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
// A 403 on a plain server-side fetch is almost always bot-protection keyed on
// browser fingerprint/TLS (Cloudflare, etc.), not the page actually being
// gone -- a real browser routinely loads the same URL fine (confirmed live
// 2026-09-11 on West Beach Bar & Grill). Retrying automatically here means a
// venue only needs its requiresBrowser flag hand-set for JS-rendering issues;
// bot-blocking recovers on its own without a human ever noticing the 403.
async function fetchWithBrowserFallback(url: string, useBrowser: boolean): Promise<FetchResult> {
  if (useBrowser) {
    return fetchAndExtractTextViaBrowser(url);
  }
  const plain = await fetchAndExtractText(url);
  if (plain.ok || !/^HTTP 403/i.test(plain.error)) {
    return plain;
  }
  console.warn(`[${url}] got HTTP 403 on plain fetch, retrying via browser`);
  return fetchAndExtractTextViaBrowser(url);
}

async function fetchAllPages(
  urls: string[],
  useBrowser: boolean
): Promise<{ combinedText: string; errors: string[]; tokensUsed: number }> {
  const parts: string[] = [];
  const errors: string[] = [];
  let tokensUsed = 0;
  for (const url of urls) {
    const result = await fetchWithBrowserFallback(url, useBrowser);
    if (!result.ok) {
      errors.push(`${url}: ${result.error}`);
      continue;
    }
    tokensUsed += result.tokensUsed;
    if (result.text.trim().length < SUSPICIOUSLY_SHORT_PAGE_CHARS) {
      console.warn(
        `[${url}] fetched only ${result.text.trim().length} char(s) -- likely a JS-rendered widget/embed this plain fetch can't see through (e.g. a third-party ordering platform or Canva-style menu viewer)`
      );
    }
    parts.push(`=== PAGE: ${url} ===\n${result.text}`);
  }
  return { combinedText: parts.join("\n\n"), errors, tokensUsed };
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
): Promise<{ tokensUsed: number; error?: string }> {
  const urls = venueUrls(venue);
  if (urls.length === 0) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error: "no website or menu_url configured",
    });
    console.error(`[${venue.name}] skipped: no website or menu_url configured`);
    return { tokensUsed: 0 };
  }

  const { combinedText, errors, tokensUsed: fetchTokens } = await fetchAllPages(urls, venue.requiresBrowser);
  if (!combinedText) {
    const error = errors.join("; ") || "all page fetches failed";
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: fetchTokens,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error,
    });
    console.error(`[${venue.name}] all ${urls.length} page fetch(es) failed: ${errors.join("; ")}`);
    return { tokensUsed: fetchTokens, error };
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
    // fetchTokens (not 0): image transcription, when a venue has one, ran
    // and spent real tokens on THIS fetch regardless of whether the combined
    // hash matched -- logging 0 here would hide that spend from both the
    // token ceiling and the per-run total.
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: false,
      tokensUsed: fetchTokens,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error: null,
    });
    console.log(`[${venue.name}] unchanged, skipped extraction`);
    return { tokensUsed: fetchTokens };
  }

  // Captured outside the try: the Anthropic call can succeed (spending real
  // tokens) and a later step in the same block still throw. Logging 0 there
  // would hide that spend and stop TOKEN_CEILING from ever aborting a
  // runaway night whose failures all land after the API call. Starts at
  // fetchTokens (not 0) so image transcription's spend during the fetch
  // stage is never dropped from the total, win or lose.
  let tokensSpent = fetchTokens;
  try {
    const includeMenuItems = !(await hasFreshMenuItems(venue.id, MENU_ITEMS_RECHECK_DAYS));
    const { specials, events, menuItems, tokensUsed, cacheCreationTokens, cacheReadTokens, outputTokens } =
      await extractVenueContent(normalized, includeMenuItems);
    tokensSpent += tokensUsed;
    await replaceVenueSpecials(venue.id, regionId, sourceUrl, specials);
    await replaceVenueEvents(venue.id, regionId, sourceUrl, events);
    // Only touch menu items when this call actually asked for them -- passing an
    // empty array here when menu items were deliberately skipped would make
    // replaceVenueMenuItems's reconciliation logic archive every existing menu
    // item for this venue, as if the venue had removed its whole menu.
    if (includeMenuItems) {
      await replaceVenueMenuItems(venue.id, sourceUrl, menuItems);
    }
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: true,
      tokensUsed: tokensSpent,
      cacheCreationTokens,
      cacheReadTokens,
      outputTokens,
      error: null,
    });
    console.log(
      `[${venue.name}] changed, extracted ${specials.length} special(s), ${events.length} event(s), ` +
        `${includeMenuItems ? `${menuItems.length} menu item(s)` : "menu items skipped (fresh)"}, ${tokensSpent} tokens`
    );
    return { tokensUsed: tokensSpent };
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
      // The failure could have happened before or after the Anthropic call within this
      // try block -- there's no cache/output split to attribute at this catch site, so
      // log 0 here rather than guess; tokensSpent (the volume total) still isn't lost.
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error: `extraction failed: ${message}`,
    });
    console.error(
      `[${venue.name}] extraction failed after ${tokensSpent} token(s): ${message}`
    );
    return { tokensUsed: tokensSpent, error: message };
  }
}

// A specific, unambiguous signal that the Anthropic account itself can't be
// billed right now (not a transient per-page issue like a 403 or a timeout).
// Seen live 2026-09-11: the account ran out of credit mid-run and every
// remaining venue failed silently with this message -- nothing surfaced it
// until a human happened to read the raw logs. Matching on the account-level
// phrase (not just "failed") keeps this from false-triggering on ordinary
// per-venue fetch/extraction noise, which is expected most nights.
const BILLING_FAILURE_RE = /credit balance is too low/i;

// Batches are billed at half the sync-call rate for every token (input, output, both
// cache tiers) in exchange for async delivery -- Anthropic's own SLA is up to 24h, though
// in practice a batch this size (well under a few thousand requests) usually finishes in
// minutes. This is the same fetch+hash+skip-if-unchanged logic processVenue runs above,
// just split at the point where processVenue used to call extractVenueContent directly --
// here it builds a request and queues it for batch submission instead. Returns "logged"
// once logScrapeRun has already been called (nothing changed, or fetching itself failed --
// no Anthropic call needed either way) or "queued" with everything applying this venue's
// eventual batch result will need.
interface QueuedBatchItem {
  venueId: number;
  venueName: string;
  regionId: number;
  customId: string;
  truncatedPageText: string;
  haystack: string;
  includeMenuItems: boolean;
  contentHash: string;
  sourceUrl: string;
  fetchTokens: number;
}

async function fetchVenueForBatch(
  venue: {
    id: number;
    name: string;
    website: string | null;
    menuUrl: string | null;
    sourceUrls: string[];
    requiresBrowser: boolean;
    claimedAt: Date | null;
  },
  regionId: number
): Promise<
  | { kind: "logged"; tokensUsed: number; error?: string }
  | { kind: "queued"; item: QueuedBatchItem; estimatedTokens: number }
> {
  // A claimed venue's listing is owner-maintained -- scraping over it would create a
  // confusing mixed state where fresh scraped data and owner-entered data both show
  // live and possibly contradict each other. sourceUrl: null already protects the
  // owner's own rows from cron/upsert.ts's reconciliation (see the plan this shipped
  // from), but skipping entirely here also avoids wasting extraction tokens on a venue
  // whose page content the site will never actually use.
  if (venue.claimedAt !== null) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error: null,
    });
    console.log(`[${venue.name}] skipped: venue is owner-claimed`);
    return { kind: "logged", tokensUsed: 0 };
  }

  const urls = venueUrls(venue);
  if (urls.length === 0) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error: "no website or menu_url configured",
    });
    console.error(`[${venue.name}] skipped: no website or menu_url configured`);
    return { kind: "logged", tokensUsed: 0 };
  }

  const { combinedText, errors, tokensUsed: fetchTokens } = await fetchAllPages(urls, venue.requiresBrowser);
  if (!combinedText) {
    const error = errors.join("; ") || "all page fetches failed";
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: fetchTokens,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error,
    });
    console.error(`[${venue.name}] all ${urls.length} page fetch(es) failed: ${errors.join("; ")}`);
    return { kind: "logged", tokensUsed: fetchTokens, error };
  }
  if (errors.length > 0) {
    console.warn(`[${venue.name}] ${errors.length}/${urls.length} page fetch(es) failed: ${errors.join("; ")}`);
  }

  const normalized = normalizeText(combinedText);
  const hash = hashText(normalized);
  const previousHash = await getLastContentHash(venue.id);
  const sourceUrl = urls.join(", ");

  if (previousHash === hash) {
    await markVenueStillCurrent(venue.id);
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: false,
      tokensUsed: fetchTokens,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error: null,
    });
    console.log(`[${venue.name}] unchanged, skipped extraction`);
    return { kind: "logged", tokensUsed: fetchTokens };
  }

  const includeMenuItems = !(await hasFreshMenuItems(venue.id, MENU_ITEMS_RECHECK_DAYS));
  const { truncated, haystack } = truncatePageText(normalized);

  return {
    kind: "queued",
    estimatedTokens: estimateExtractionTokens(truncated),
    item: {
      venueId: venue.id,
      venueName: venue.name,
      regionId,
      // Unique within this one batch (one venue appears once per region per run), which
      // is all Anthropic requires -- custom_id uniqueness is scoped to the batch it's in.
      customId: `venue-${venue.id}`,
      truncatedPageText: truncated,
      haystack,
      includeMenuItems,
      contentHash: hash,
      sourceUrl,
      fetchTokens,
    },
  };
}

// Writes one batch item's result the same way processVenue's try block used to write a
// sync extraction's result -- reconciles specials/events/(menu items, if asked for) and
// logs the scrape run. `item` comes from the DB (extraction_batch_items), not from live
// venue state, since the batch may be resolving on a different cron invocation than the
// one that submitted it.
async function applyBatchItemResult(
  item: PendingBatchItem,
  outcome: BatchResultOutcome["outcome"],
  billing: { failures: number }
): Promise<void> {
  if (!outcome.ok) {
    if (BILLING_FAILURE_RE.test(outcome.error)) billing.failures++;
    await logScrapeRun({
      venueId: item.venueId,
      // null, not item.contentHash: recording the new hash here would make tomorrow's run
      // see previousHash === hash and skip extraction forever, permanently freezing this
      // venue on a single failed batch item while it still reads as "verified today".
      contentHash: null,
      changed: true,
      tokensUsed: item.fetchTokens,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      error: `batch extraction failed: ${outcome.error}`,
    });
    console.error(`[venue ${item.venueId}] batch extraction failed: ${outcome.error}`);
    await markExtractionBatchItemDone(item.id, "failed", outcome.error);
    return;
  }

  const { specials, events, menuItems } = outcome.data;
  const tokensSpent = item.fetchTokens + outcome.tokensUsed;
  await replaceVenueSpecials(item.venueId, item.regionId, item.sourceUrl, specials);
  await replaceVenueEvents(item.venueId, item.regionId, item.sourceUrl, events);
  // Only touch menu items when this call actually asked for them -- passing an empty
  // array here when menu items were deliberately skipped would make
  // replaceVenueMenuItems's reconciliation logic archive every existing menu item for
  // this venue, as if the venue had removed its whole menu.
  if (item.includeMenuItems) {
    await replaceVenueMenuItems(item.venueId, item.sourceUrl, menuItems);
  }
  await logScrapeRun({
    venueId: item.venueId,
    contentHash: item.contentHash,
    changed: true,
    tokensUsed: tokensSpent,
    cacheCreationTokens: outcome.cacheCreationTokens,
    cacheReadTokens: outcome.cacheReadTokens,
    outputTokens: outcome.outputTokens,
    error: null,
  });
  console.log(
    `[venue ${item.venueId}] batch applied: ${specials.length} special(s), ${events.length} event(s), ` +
      `${item.includeMenuItems ? `${menuItems.length} menu item(s)` : "menu items skipped (fresh)"}, ${tokensSpent} tokens`
  );
  await markExtractionBatchItemDone(item.id, "applied");
}

async function applyResolvedBatch(batch: PendingBatch, billing: { failures: number }): Promise<void> {
  const haystackByCustomId = new Map(batch.items.map((i) => [i.customId, i.pageTextHaystack]));
  let results: BatchResultOutcome[];
  try {
    results = await fetchBatchResults(batch.anthropicBatchId, haystackByCustomId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Batch ${batch.anthropicBatchId}: failed to fetch results: ${message}`);
    for (const item of batch.items) {
      await applyBatchItemResult(item, { ok: false, error: `failed to fetch batch results: ${message}` }, billing);
    }
    await markExtractionBatchResolved(batch.id, "failed");
    return;
  }
  const outcomeByCustomId = new Map(results.map((r) => [r.customId, r.outcome]));
  for (const item of batch.items) {
    const outcome = outcomeByCustomId.get(item.customId);
    await applyBatchItemResult(
      item,
      outcome ?? { ok: false, error: "no result returned for this custom_id" },
      billing
    );
  }
  await markExtractionBatchResolved(batch.id, "applied");
}

const BATCH_POLL_INTERVAL_MS = 15_000;
// How long the end of a run is willing to wait on batches submitted THIS run before
// giving up and leaving them for tomorrow's run to pick back up (see the
// resolvePendingBatches(0, ...) call at the top of runScrapeCycle). Bounded well under
// Railway's own job timeout -- a batch that hasn't finished in 8 minutes almost always
// means genuine queueing on Anthropic's side, not something worth burning the rest of
// the night's cron run waiting on.
const BATCH_POLL_TIMEOUT_MS = 8 * 60 * 1000;

// Checks every batch still awaiting results -- including ones a PREVIOUS cron run
// submitted and didn't see finish in time -- and applies whichever have finished.
// waitMs bounds how long this run is willing to sit polling a batch that's still
// in_progress before giving up and leaving it for the next run to pick back up; a run
// checking on old batches at startup passes 0 (don't wait, just check once), while the
// tail end of a run that just submitted fresh batches passes a real window so tonight's
// results can go live tonight instead of waiting until tomorrow.
async function resolvePendingBatches(waitMs: number, billing: { failures: number }): Promise<void> {
  const deadline = Date.now() + waitMs;
  let pending = await getPendingExtractionBatches();
  if (pending.length === 0) return;

  for (;;) {
    let anyInProgress = false;
    for (const batch of pending) {
      if (batch.items.length === 0) {
        await markExtractionBatchResolved(batch.id, "applied");
        continue;
      }
      const poll = await pollBatchStatus(batch.anthropicBatchId);
      if (poll.status === "not_found") {
        for (const item of batch.items) {
          await markExtractionBatchItemDone(item.id, "failed", "batch not found (expired or deleted)");
        }
        await markExtractionBatchResolved(batch.id, "failed");
        continue;
      }
      if (poll.status === "in_progress") {
        anyInProgress = true;
        continue;
      }
      console.log(
        `Batch ${batch.anthropicBatchId} (region ${batch.regionId}) finished -- applying results for ${batch.items.length} venue(s).`
      );
      await applyResolvedBatch(batch, billing);
    }

    pending = await getPendingExtractionBatches();
    if (pending.length === 0 || !anyInProgress || Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, BATCH_POLL_INTERVAL_MS));
  }

  if (pending.length > 0) {
    console.log(`${pending.length} batch(es) still in progress -- will check again on the next cron run.`);
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
  if (!CRON_REGIONS_FILTER && !CRON_ALLOW_FULL_SWEEP) {
    throw new Error(
      "Refusing to run an unscoped full-platform cron.\n" +
        "  - To scope this run to specific regions: CRON_REGIONS=slug1,slug2 npm run cron\n" +
        "  - To deliberately run every active region (this is what the scheduled nightly\n" +
        "    cron does, via a var set only on Railway's \"cron\" service): CRON_ALLOW_FULL_SWEEP=1 npm run cron\n" +
        "See docs/ADDING_A_REGION.md's Phase 4 for why this exists -- an unscoped run has\n" +
        "caused a real, avoidable Anthropic API cost spike twice."
    );
  }

  const allActiveRegions = await db.select().from(regions).where(eq(regions.active, true));
  const activeRegions = CRON_REGIONS_FILTER
    ? allActiveRegions.filter((r) => CRON_REGIONS_FILTER.has(r.slug))
    : allActiveRegions;
  if (CRON_REGIONS_FILTER) {
    console.log(
      `CRON_REGIONS set -- scoping this run to: ${activeRegions.map((r) => r.slug).join(", ") || "(none matched)"}`
    );
  }
  if (CRON_NEVER_SCRAPED_ONLY) {
    console.log("CRON_NEVER_SCRAPED_ONLY set -- skipping every venue that already has a scrape_runs row.");
  }

  let aborted = false;
  const billing = { failures: 0 };

  // Batches submitted by a PREVIOUS cron run (one that didn't see its batch finish
  // within its own polling window) get checked -- and applied, if now done -- before
  // this run fetches or submits anything new. waitMs=0: just a status check, no reason
  // to sit here waiting on a batch that's had all night to finish and still hasn't.
  console.log("Checking for batches left in progress by a previous run...");
  await resolvePendingBatches(0, billing);

  for (const region of activeRegions) {
    const tokenCeiling = Math.min(region.tokenCeiling, CRON_TOKEN_CEILING_OVERRIDE ?? Infinity);
    const fetchedVenues = await getActiveVenues(region.id);
    const venueList = CRON_NEVER_SCRAPED_ONLY
      ? fetchedVenues.filter((v) => v.neverScraped)
      : fetchedVenues;
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

    // estimatedTokens (pre-submission) here, not real usage -- the Batch API's async
    // delivery means real per-venue token spend isn't known until the batch resolves,
    // possibly on a later run, long after this loop has moved on. See
    // estimateExtractionTokens in cron/batchExtract.ts for the estimate itself.
    let estimatedTokens = 0;
    const queued: QueuedBatchItem[] = [];

    for (const venue of venueList) {
      const result = await fetchVenueForBatch(venue, region.id);
      if (result.kind === "logged") {
        estimatedTokens += result.tokensUsed;
        if (result.error && BILLING_FAILURE_RE.test(result.error)) {
          billing.failures++;
        }
        continue;
      }
      if (estimatedTokens + result.estimatedTokens >= tokenCeiling) {
        aborted = true;
        console.error(
          `Token ceiling (${tokenCeiling}) reached for region ${region.slug} — aborting remaining venues starting at "${venue.name}"`
        );
        break;
      }
      estimatedTokens += result.estimatedTokens;
      queued.push(result.item);
    }

    if (queued.length > 0) {
      console.log(`Submitting batch of ${queued.length} venue(s) for region ${region.slug}...`);
      try {
        const anthropicBatchId = await submitExtractionBatch(
          queued.map((q) => ({
            customId: q.customId,
            truncatedPageText: q.truncatedPageText,
            includeMenuItems: q.includeMenuItems,
          }))
        );
        await createExtractionBatch(
          anthropicBatchId,
          region.id,
          queued.map((q) => ({
            venueId: q.venueId,
            regionId: q.regionId,
            customId: q.customId,
            sourceUrl: q.sourceUrl,
            contentHash: q.contentHash,
            includeMenuItems: q.includeMenuItems,
            fetchTokens: q.fetchTokens,
            pageTextHaystack: q.haystack,
          }))
        );
        console.log(`Batch ${anthropicBatchId} submitted for region ${region.slug}.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Batch submission failed for region ${region.slug}: ${message}`);
        if (BILLING_FAILURE_RE.test(message)) billing.failures++;
        // Nothing was queued into extraction_batches for this failed submission -- log
        // each venue's own scrape run now rather than leaving it silently unaccounted
        // for, since no batch will ever resolve for it.
        for (const item of queued) {
          await logScrapeRun({
            venueId: item.venueId,
            contentHash: null,
            changed: true,
            tokensUsed: item.fetchTokens,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            outputTokens: 0,
            error: `batch submission failed: ${message}`,
          });
        }
      }
    }

    console.log(`Region ${region.slug} complete. Estimated tokens queued: ${estimatedTokens}`);
  }

  // Gives batches submitted just above a real window to finish within THIS run, so
  // tonight's specials go live tonight rather than waiting for tomorrow's run to notice
  // the batch finished. Anything still unresolved after this just falls through to the
  // resolvePendingBatches(0, ...) call at the top of tomorrow's run.
  console.log("Waiting briefly for tonight's freshly-submitted batches to resolve...");
  await resolvePendingBatches(BATCH_POLL_TIMEOUT_MS, billing);

  const billingFailures = billing.failures;

  try {
    const { inserted } = await withTimeout(scrapeCastanetEvents(), 120_000, "Castanet scrape");
    console.log(`Castanet events: refreshed ${inserted} nightlife-adjacent event(s)`);
  } catch (err) {
    console.error("Castanet scrape failed:", err instanceof Error ? err.message : err);
  }

  try {
    // NowMedia is the one scraper here that launches a real Playwright
    // browser (openBrowserSession in cron/fetch.ts) -- a hung launch or an
    // untimed page operation blocks every step after it forever, since none
    // of these steps throw on their own to trip the surrounding try/catch.
    // Confirmed live 2026-09-14: a hang here silently blocked 604Now,
    // analytics pruning, monthly-special archival, and booking sync on a
    // run that had otherwise finished all its actual region work, and would
    // do the same to every future nightly run until manually killed.
    const { inserted } = await withTimeout(scrapeNowMediaEvents(), 120_000, "NowMedia scrape");
    console.log(`NowMedia events: refreshed ${inserted} nightlife-adjacent event(s)`);
  } catch (err) {
    console.error("NowMedia scrape failed:", err instanceof Error ? err.message : err);
  }

  try {
    const { inserted } = await withTimeout(scrape604NowEvents(), 120_000, "604Now scrape");
    console.log(`604Now events: refreshed ${inserted} nightlife-adjacent event(s)`);
  } catch (err) {
    console.error("604Now scrape failed:", err instanceof Error ? err.message : err);
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

  // Unlike the token-ceiling case above, this IS a real failure worth a
  // Railway crash email -- the account can't be billed, so every venue
  // scraped after the first failure got zero extraction for free, silently,
  // until this. Every other step above already ran to completion regardless
  // (this only sets the exit code, it doesn't throw), so nothing else in
  // tonight's run is skipped because of it.
  if (billingFailures > 0) {
    console.error(
      `ALERT: ${billingFailures} venue(s) failed extraction tonight because the Anthropic account has insufficient credit balance. Add credit at console.anthropic.com -> Plans & Billing. No further AI extraction will succeed until this is resolved.`
    );
    process.exitCode = 1;
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
