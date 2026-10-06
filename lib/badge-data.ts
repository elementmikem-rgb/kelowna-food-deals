import { db, badgeImpressions, venues } from "@/db";
import { eq, sql, inArray } from "drizzle-orm";
import { toDateOrNull } from "@/lib/time";

export interface BadgeAdoptionRow {
  venueId: number;
  venueName: string;
  totalImpressions: number;
  // A load whose Referer header isn't on todaystab.com itself -- the real "this venue's
  // own website is actually displaying the badge" signal. todaystab.com shows up in the
  // raw log too (the dashboard's own live preview of the badge), which doesn't count as
  // adoption, so it's excluded here rather than from the table itself (see
  // db/schema.ts's badgeImpressions comment for why the log stays unfiltered).
  externalImpressions: number;
  firstSeen: Date;
  lastSeen: Date;
  sampleReferrer: string | null;
}

export interface BadgeSummary {
  venuesWithAnyImpression: number;
  venuesWithExternalImpression: number;
  totalImpressions: number;
}

const notOwnDomain = sql<boolean>`${badgeImpressions.referrer} is not null and ${badgeImpressions.referrer} not ilike '%todaystab.com%'`;

export async function getBadgeSummary(regionIds: number[] | "all"): Promise<BadgeSummary> {
  const scoped = regionIds === "all" ? undefined : inArray(venues.regionId, regionIds);

  const rows = await db
    .select({
      venueId: badgeImpressions.venueId,
      isExternal: notOwnDomain,
    })
    .from(badgeImpressions)
    .innerJoin(venues, eq(badgeImpressions.venueId, venues.id))
    .where(scoped);

  const anyVenues = new Set(rows.map((r) => r.venueId));
  const externalVenues = new Set(rows.filter((r) => r.isExternal).map((r) => r.venueId));

  return {
    venuesWithAnyImpression: anyVenues.size,
    venuesWithExternalImpression: externalVenues.size,
    totalImpressions: rows.length,
  };
}

export async function getBadgeAdoption(regionIds: number[] | "all"): Promise<BadgeAdoptionRow[]> {
  const scoped = regionIds === "all" ? undefined : inArray(venues.regionId, regionIds);

  const rows = await db
    .select({
      venueId: badgeImpressions.venueId,
      venueName: venues.name,
      totalImpressions: sql<number>`count(*)::int`,
      externalImpressions: sql<number>`count(*) filter (where ${notOwnDomain})::int`,
      firstSeen: sql<Date>`min(${badgeImpressions.createdAt})`,
      lastSeen: sql<Date>`max(${badgeImpressions.createdAt})`,
      sampleReferrer: sql<string | null>`(
        select referrer from specials.badge_impressions bi2
        where bi2.venue_id = ${badgeImpressions.venueId}
          and bi2.referrer is not null and bi2.referrer not ilike '%todaystab.com%'
        order by bi2.created_at desc
        limit 1
      )`,
    })
    .from(badgeImpressions)
    .innerJoin(venues, eq(badgeImpressions.venueId, venues.id))
    .where(scoped)
    .groupBy(badgeImpressions.venueId, venues.name)
    .orderBy(sql`max(${badgeImpressions.createdAt}) desc`);

  // min()/max() of a timestamptz column comes back as a plain Postgres-formatted
  // string from the driver, not a real Date, despite the sql<Date> type annotation
  // above claiming otherwise -- same gotcha as every other raw-SQL timestamp column
  // in this codebase (see lib/time.ts's toDateOrNull comment).
  return rows.map((r) => ({
    ...r,
    firstSeen: toDateOrNull(r.firstSeen)!,
    lastSeen: toDateOrNull(r.lastSeen)!,
  }));
}
