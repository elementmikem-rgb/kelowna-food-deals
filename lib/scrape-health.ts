import { db, venues, specials, events, regions, scrapeRuns } from "@/db";
import { eq, and, isNull, isNotNull, notInArray, sql, desc, gt } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";
import { estimateCostUsd } from "@/lib/anthropic-pricing";

// A venue manually confirmed to have nothing promotional isn't checked again
// for this long -- long enough to stop the same dive bar resurfacing every
// session, short enough that a venue whose site later grows a specials page
// still gets rechecked eventually rather than being suppressed forever.
export const ZERO_LISTING_RECHECK_DAYS = 90;

export interface ZeroListingVenue {
  id: number;
  name: string;
  regionSlug: string;
  website: string | null;
  checkedNoListingsAt: Date | null;
  checkedNoListingsNote: string | null;
}

// A venue with zero active specials AND zero active events is either
// genuinely thin (its site really has nothing promotional -- a correct,
// expected state per docs/ADDING_A_REGION.md) or silently broken (bad URL,
// bot-blocked, JS-rendered content the scraper can't see). This list can't
// tell those apart on its own -- it's a starting point for a human to check,
// same as the manual audit that found this gap in the first place
// (2026-09-11: 10 of 38 flagged venues turned out to have real content a
// plain fetch had missed).
export async function getZeroListingVenues(regionIds: number[] | "all"): Promise<ZeroListingVenue[]> {
  // isNotNull(venueId) matters here specifically for events -- a location-only
  // event (no matched venue, see scrapeCastanet.ts/scrape604now.ts) stores
  // venueId as null. SQL's "x NOT IN (subquery)" evaluates to UNKNOWN (never
  // true) for every row the instant that subquery contains even one NULL,
  // which silently made this whole function return zero results platform-wide
  // regardless of real venue data -- confirmed live 2026-09-12, not a rare
  // edge case since most regions have at least one unmatched-venue event.
  const specialVenueIds = db.select({ id: specials.venueId }).from(specials).where(isNull(specials.archivedAt));
  const eventVenueIds = db
    .select({ id: events.venueId })
    .from(events)
    .where(and(isNull(events.archivedAt), isNotNull(events.venueId)));

  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      regionSlug: regions.slug,
      website: venues.website,
      checkedNoListingsAt: venues.checkedNoListingsAt,
      checkedNoListingsNote: venues.checkedNoListingsNote,
    })
    .from(venues)
    .innerJoin(regions, eq(regions.id, venues.regionId))
    .where(
      and(
        eq(venues.active, true),
        regionScopeCondition(venues.regionId, regionIds),
        notInArray(venues.id, specialVenueIds),
        notInArray(venues.id, eventVenueIds),
        sql`(${venues.checkedNoListingsAt} IS NULL OR ${venues.checkedNoListingsAt} < now() - (${ZERO_LISTING_RECHECK_DAYS} || ' days')::interval)`
      )
    )
    .orderBy(venues.name);

  return rows;
}

export interface FailingVenue {
  id: number;
  name: string;
  regionSlug: string;
  lastError: string;
  lastRanAt: Date;
}

// Some errors this app stores verbatim (e.g. Playwright's own thrown
// messages, seen live for O'Flannigan's/Red Swan Pizza) carry ANSI colour
// escape codes meant for a terminal -- rendered as-is in the admin UI these
// show up as garbled box characters instead of readable text.
function stripAnsiCodes(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// Only the MOST RECENT run per venue in the last 3 days -- a venue that
// failed once three nights ago but has succeeded since shouldn't still show
// up as broken. Fetches the whole recent window and groups in JS rather than
// a DISTINCT ON query: the row count here is small (roughly one row per
// active venue per night) and this keeps the query itself simple.
export async function getRecentlyFailingVenues(regionIds: number[] | "all"): Promise<FailingVenue[]> {
  const rows = await db
    .select({
      venueId: scrapeRuns.venueId,
      error: scrapeRuns.error,
      ranAt: scrapeRuns.ranAt,
      venueName: venues.name,
      regionSlug: regions.slug,
    })
    .from(scrapeRuns)
    .innerJoin(venues, eq(venues.id, scrapeRuns.venueId))
    .innerJoin(regions, eq(regions.id, venues.regionId))
    .where(
      and(
        eq(venues.active, true),
        regionScopeCondition(venues.regionId, regionIds),
        sql`${scrapeRuns.ranAt} > now() - interval '3 days'`
      )
    )
    .orderBy(desc(scrapeRuns.ranAt));

  const latestByVenue = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByVenue.has(row.venueId)) latestByVenue.set(row.venueId, row);
  }

  return Array.from(latestByVenue.values())
    .filter((r) => r.error !== null)
    .map((r) => ({
      id: r.venueId,
      name: r.venueName,
      regionSlug: r.regionSlug,
      lastError: stripAnsiCodes(r.error!),
      lastRanAt: r.ranAt,
    }));
}

export interface DailyCronSpend {
  day: string; // "2026-09-16", Pacific calendar day (matches when the cron actually runs)
  venueRuns: number;
  totalTokens: number;
  costUsd: number;
}

export interface CronSpendSummary {
  days: DailyCronSpend[];
  monthToDateUsd: number;
}

// Not region-scoped like the rest of this file (Recently failing / Zero listings) --
// the nightly cron is one shared job across every region, so "spend for Kelowna" isn't
// a real, separately-billed thing the way "specials for Kelowna" is. This is a platform-
// wide operational cost, always shown in full regardless of the admin's region filter.
export async function getCronSpend(days = 14): Promise<CronSpendSummary> {
  const rows = await db
    .select({
      // Group by Pacific calendar day, not UTC -- the cron fires at 6am Pacific, so a
      // UTC grouping would sometimes split one night's run across two UTC dates.
      day: sql<string>`(${scrapeRuns.ranAt} AT TIME ZONE 'America/Vancouver')::date::text`,
      venueRuns: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${scrapeRuns.tokensUsed}), 0)::bigint`,
      cacheCreationTokens: sql<number>`coalesce(sum(${scrapeRuns.cacheCreationTokens}), 0)::bigint`,
      cacheReadTokens: sql<number>`coalesce(sum(${scrapeRuns.cacheReadTokens}), 0)::bigint`,
      outputTokens: sql<number>`coalesce(sum(${scrapeRuns.outputTokens}), 0)::bigint`,
    })
    .from(scrapeRuns)
    .where(gt(scrapeRuns.ranAt, sql`now() - (${days} || ' days')::interval`))
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`);

  const daySummaries = rows.map((r) => ({
    day: r.day,
    venueRuns: r.venueRuns,
    totalTokens: Number(r.totalTokens),
    costUsd: estimateCostUsd({
      totalTokens: Number(r.totalTokens),
      cacheCreationTokens: Number(r.cacheCreationTokens),
      cacheReadTokens: Number(r.cacheReadTokens),
      outputTokens: Number(r.outputTokens),
    }),
  }));

  const [monthRow] = await db
    .select({
      totalTokens: sql<number>`coalesce(sum(${scrapeRuns.tokensUsed}), 0)::bigint`,
      cacheCreationTokens: sql<number>`coalesce(sum(${scrapeRuns.cacheCreationTokens}), 0)::bigint`,
      cacheReadTokens: sql<number>`coalesce(sum(${scrapeRuns.cacheReadTokens}), 0)::bigint`,
      outputTokens: sql<number>`coalesce(sum(${scrapeRuns.outputTokens}), 0)::bigint`,
    })
    .from(scrapeRuns)
    .where(
      gt(
        scrapeRuns.ranAt,
        sql`date_trunc('month', now() AT TIME ZONE 'America/Vancouver') AT TIME ZONE 'America/Vancouver'`
      )
    );

  const monthToDateUsd = monthRow
    ? estimateCostUsd({
        totalTokens: Number(monthRow.totalTokens),
        cacheCreationTokens: Number(monthRow.cacheCreationTokens),
        cacheReadTokens: Number(monthRow.cacheReadTokens),
        outputTokens: Number(monthRow.outputTokens),
      })
    : 0;

  return { days: daySummaries, monthToDateUsd };
}
