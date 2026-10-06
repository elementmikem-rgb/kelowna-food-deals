import { db, specials, venues, dealFeedback } from "@/db";
import { and, desc, eq, gt, isNull, isNotNull, notExists, or, sql } from "drizzle-orm";
import { toDateOrNull } from "@/lib/time";
import { alias } from "drizzle-orm/pg-core";
import type { SpecialCategory } from "@/db/schema";

export interface SpecialWithVenue {
  id: number;
  venueId: number;
  venueName: string;
  venueCity: string | null;
  title: string;
  description: string | null;
  priceCents: number | null;
  dayOfWeek: number | null;
  isMonthly: boolean;
  startTime: string | null;
  endTime: string | null;
  category: SpecialCategory;
  lastVerifiedAt: Date;
  confidence: number;
  // Paid promotion timestamps -- see db/schema.ts. Null or past = not promoted;
  // consumers compare against Date.now() rather than trusting these as booleans.
  venueFeaturedUntil: Date | null;
  boostedUntil: Date | null;
  // Separate, independent add-on from boostedUntil -- see db/schema.ts.
  chatBoostedUntil: Date | null;
  // Standing paid status -- unlike the two above, doesn't expire on its own.
  // Non-null means "is a partner", the exact date isn't otherwise used yet.
  venuePartnerSince: Date | null;
  // Non-null means an owner has claimed and actively maintains this venue's listing --
  // drives the "Owner verified" trust badge, distinct from the scrape-verified stamp.
  venueClaimedAt: Date | null;
  venueConfirmedAt: Date | null;
  // Count of visitor "confirm" feedback rows from the last 30 days -- a rolling window
  // so an old special's count doesn't just accumulate forever and lose meaning. See
  // docs/superpowers/specs/2026-09-07-deal-verification-design.md Section 1.
  confirmCount: number;
  // Timestamp of the most recent visitor confirm (any window, not the 30-day one
  // confirmCount uses) -- drives the "live" confirm badge (ConfirmedBadges/
  // isRecentConfirm in lib/time.ts), which only reads as "live" for a few hours.
  lastConfirmedAt: Date | null;
  // Whether a paid photo add-on photo exists -- a boolean flag rather than shipping the
  // base64 photoData itself in this list query, which would bloat every page load with
  // image bytes most cards don't even show (only rendered while boostedUntil is active,
  // via /api/specials/[id]/photo).
  hasPhoto: boolean;
  // Most recent visitor-submitted venue photo (specials.venue_photos), if any -- shown
  // as the card's lead image on the region board. Distinct from hasPhoto above, which
  // is the paid boost photo add-on tied to this specific special. Most venues have none
  // yet (submission-driven), so consumers must handle null gracefully.
  venuePhotoId: number | null;
  // Map view fields (components/MapView.tsx) -- included on every fetch rather than a
  // separate query, since the map reads the exact same specials data the list view
  // already loaded, just grouped and plotted differently.
  venueLat: number | null;
  venueLng: number | null;
  // True when venueLat/venueLng is the parent region's center point, not this venue's
  // own geocoded address (see venues.approxCoords in db/schema.ts) -- the map skips
  // these rather than plotting a pin at the wrong building.
  venueApproxCoords: boolean;
  venueMapPinBoostedUntil: Date | null;
  // Flash special (db/schema.ts) -- non-null flashExpiresAt means this row is a
  // venue-posted, time-limited urgent deal rather than a normal recurring special.
  // Queries below only ever return an unexpired one (or null), so any consumer
  // seeing a non-null value here can treat it as "currently live" without an extra
  // now() check of its own.
  flashExpiresAt: Date | null;
  flashClaimLimit: number | null;
  flashClaimCount: number;
}

export interface PreviousSpecial extends SpecialWithVenue {
  archivedAt: Date;
}

const baseColumns = {
  id: specials.id,
  venueId: specials.venueId,
  venueName: venues.name,
  venueCity: venues.city,
  title: specials.title,
  description: specials.description,
  priceCents: specials.priceCents,
  dayOfWeek: specials.dayOfWeek,
  isMonthly: specials.isMonthly,
  startTime: specials.startTime,
  endTime: specials.endTime,
  category: specials.category,
  lastVerifiedAt: specials.lastVerifiedAt,
  confidence: specials.confidence,
  venueFeaturedUntil: venues.featuredUntil,
  boostedUntil: specials.boostedUntil,
  chatBoostedUntil: specials.chatBoostedUntil,
  venuePartnerSince: venues.partnerSince,
  venueClaimedAt: venues.claimedAt,
  venueConfirmedAt: specials.venueConfirmedAt,
  confirmCount: sql<number>`(
    select count(*)::int from specials.deal_feedback
    where item_id = ${specials.id} and kind = 'special' and feedback_type = 'confirm'
      and created_at > now() - interval '30 days'
  )`,
  lastConfirmedAt: sql<Date | null>`(
    select max(created_at) from specials.deal_feedback
    where item_id = ${specials.id} and kind = 'special' and feedback_type = 'confirm'
  )`,
  hasPhoto: sql<boolean>`${specials.photoData} is not null`,
  venuePhotoId: sql<number | null>`(
    select id from specials.venue_photos
    where venue_id = ${venues.id}
    order by created_at desc
    limit 1
  )`,
  venueLat: venues.lat,
  venueLng: venues.lng,
  venueApproxCoords: venues.approxCoords,
  venueMapPinBoostedUntil: venues.mapPinBoostedUntil,
  flashExpiresAt: specials.flashExpiresAt,
  flashClaimLimit: specials.flashClaimLimit,
  flashClaimCount: specials.flashClaimCount,
};

// A flash special stops being a "deal" the moment it expires -- unlike a normal
// special (which just sits there until the next day-of-week rolls around again),
// there's nothing to show once flashExpiresAt passes. Every specials query in this
// file that feeds a public page applies this same condition rather than relying on
// a cron to clean expired rows up after the fact -- this page is force-dynamic
// (app/[region]/page.tsx), so every request already re-checks against real time.
const notExpiredFlash = or(isNull(specials.flashExpiresAt), gt(specials.flashExpiresAt, sql`now()`));

// See lib/time.ts's toDateOrNull comment -- baseColumns.lastConfirmedAt is a raw SQL
// subquery, so the driver hands it back as a plain string, not a real Date, and
// every query using baseColumns needs this fix-up before returning to a caller.
function fixLastConfirmedAt<T extends { lastConfirmedAt: Date | string | null }>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r, lastConfirmedAt: toDateOrNull(r.lastConfirmedAt) }));
}

export async function getAllSpecialsWithVenue(regionId: number): Promise<SpecialWithVenue[]> {
  const rows = await db
    .select(baseColumns)
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        eq(venues.regionId, regionId),
        isNull(specials.archivedAt),
        notExpiredFlash
      )
    );

  return fixLastConfirmedAt(rows) as SpecialWithVenue[];
}

// Scoped to one day-of-week (plus every "every day" row, dayOfWeek null) instead of
// the region's entire special set -- SpecialsBoard only ever shows one day at a time
// by default, but every page using it (the home page and every /[region]/[day] or
// /[region]/[category] SEO landing page) was fetching and hydrating all ~7 days' worth
// of data regardless, bloating the page with a client-hydration payload most of which
// was never shown. Confirmed on todaystab.com/kelowna 2026-10-06: 1.5MB of HTML, 80%
// of it one inline script tag carrying the full specials array a second time for React
// hydration. isMonthly excluded -- SpecialsBoard's own filtering already drops every
// isMonthly row unconditionally (see components/SpecialsBoard.tsx's `filtered` memo),
// so shipping them here would be dead weight with zero behavior change either way.
export async function getSpecialsWithVenueForDay(
  regionId: number,
  dayOfWeek: number
): Promise<SpecialWithVenue[]> {
  const rows = await db
    .select(baseColumns)
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        eq(venues.regionId, regionId),
        isNull(specials.archivedAt),
        notExpiredFlash,
        eq(specials.isMonthly, false),
        or(isNull(specials.dayOfWeek), eq(specials.dayOfWeek, dayOfWeek))
      )
    );

  return fixLastConfirmedAt(rows) as SpecialWithVenue[];
}

// Cheap standalone query for AboutSection's "serving X, Y, and Z" blurb -- previously
// this list was derived from the full specials array (every city with a live special,
// any day of the week), which doesn't exist as a single fetch anymore now that the
// home page only loads one day at a time. Deriving it from venues directly instead of
// specials also means a city isn't dropped from the list just because its one venue's
// special happens to run on a different day than whichever one is currently loaded.
export async function getActiveVenueCities(regionId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: venues.city })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.regionId, regionId)));
  return rows.map((r) => r.city).filter((c): c is string => !!c).sort();
}

export async function getMonthlySpecials(regionId: number): Promise<SpecialWithVenue[]> {
  const rows = await db
    .select(baseColumns)
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        eq(venues.regionId, regionId),
        isNull(specials.archivedAt),
        eq(specials.isMonthly, true)
      )
    );

  return fixLastConfirmedAt(rows) as SpecialWithVenue[];
}

const MAX_PREVIOUS_PER_VENUE = 4;

export async function getPreviousSpecials(regionId: number, limit = 30): Promise<PreviousSpecial[]> {
  // The nightly cron re-archives and re-inserts a venue's entire special set on any
  // content-hash change, so a still-running special routinely lands in the archive
  // alongside its identical live twin. Exclude any archived row whose full identity
  // still exists as an active row for the same venue -- otherwise "Previously
  // Featured" advertises specials that are live on the board directly above it.
  const live = alias(specials, "live_specials");
  const rows = await db
    .select({ ...baseColumns, archivedAt: specials.archivedAt })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        eq(venues.regionId, regionId),
        isNotNull(specials.archivedAt),
        notExists(
          db
            .select({ one: sql`1` })
            .from(live)
            .where(
              and(
                eq(live.venueId, specials.venueId),
                isNull(live.archivedAt),
                // IS NOT DISTINCT FROM, not =, so two NULL descriptions/prices/times
                // count as the same special instead of silently never matching.
                sql`${live.title} IS NOT DISTINCT FROM ${specials.title}`,
                sql`${live.description} IS NOT DISTINCT FROM ${specials.description}`,
                sql`${live.priceCents} IS NOT DISTINCT FROM ${specials.priceCents}`,
                sql`${live.category} IS NOT DISTINCT FROM ${specials.category}`,
                sql`${live.startTime} IS NOT DISTINCT FROM ${specials.startTime}`,
                sql`${live.endTime} IS NOT DISTINCT FROM ${specials.endTime}`
              )
            )
        )
      )
    )
    .orderBy(desc(specials.archivedAt))
    // Over-fetch so the per-venue cap below still has `limit` rows to work with
    // after one churny venue's surplus is trimmed away.
    .limit(limit * 5);

  const perVenue = new Map<number, number>();
  const capped: PreviousSpecial[] = [];
  for (const row of fixLastConfirmedAt(rows) as PreviousSpecial[]) {
    const seen = perVenue.get(row.venueId) ?? 0;
    if (seen >= MAX_PREVIOUS_PER_VENUE) continue;
    perVenue.set(row.venueId, seen + 1);
    capped.push(row);
    if (capped.length >= limit) break;
  }

  return capped;
}
