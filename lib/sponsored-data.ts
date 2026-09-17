import { db, venues, specials, events, categorySponsors, regions } from "@/db";
import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import type { SpecialCategory, EventType, SponsorCategoryKind } from "@/db/schema";
import { regionScopeCondition } from "@/lib/admin-region";

export interface FeaturedVenue {
  id: number;
  name: string;
  featuredUntil: Date;
}

export interface PartnerVenue {
  id: number;
  name: string;
  partnerSince: Date;
}

export interface CategorySponsor {
  id: number;
  regionId: number;
  kind: SponsorCategoryKind;
  category: SpecialCategory | EventType;
  sponsorName: string;
  sponsorUrl: string | null;
  sponsorUntil: Date | null;
}

export interface BoostedSpecial {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  boostedUntil: Date;
}

export interface BoostedEvent {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  boostedUntil: Date;
}

export interface VenueOption {
  id: number;
  name: string;
}

export interface RegionOption {
  id: number;
  brandName: string;
}

export interface SpecialOption {
  id: number;
  venueId: number;
  title: string;
}

// Only venue-owned events (venueId not null) can be boosted -- a boost's capacity
// scoping resolves its region through bookings.venueId (see booking-availability.ts),
// which a non-venue event (a winery hosting a concert, say) has no way to provide.
export interface EventOption {
  id: number;
  venueId: number;
  title: string;
}

export async function getFeaturedVenues(regionIds: number[] | "all"): Promise<FeaturedVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, featuredUntil: venues.featuredUntil })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        gt(venues.featuredUntil, new Date()),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(venues.featuredUntil));
  return rows as FeaturedVenue[];
}

export async function getBoostedSpecials(regionIds: number[] | "all"): Promise<BoostedSpecial[]> {
  const rows = await db
    .select({
      id: specials.id,
      venueId: specials.venueId,
      venueName: venues.name,
      title: specials.title,
      boostedUntil: specials.boostedUntil,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        isNull(specials.archivedAt),
        gt(specials.boostedUntil, new Date()),
        regionScopeCondition(specials.regionId, regionIds)
      )
    )
    .orderBy(asc(specials.boostedUntil));
  return rows as BoostedSpecial[];
}

export async function getBoostedEvents(regionIds: number[] | "all"): Promise<BoostedEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
      title: events.title,
      boostedUntil: events.boostedUntil,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        isNull(events.archivedAt),
        gt(events.boostedUntil, new Date()),
        regionScopeCondition(events.regionId, regionIds)
      )
    )
    .orderBy(asc(events.boostedUntil));
  return rows as BoostedEvent[];
}

export async function getPartnerVenues(regionIds: number[] | "all"): Promise<PartnerVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, partnerSince: venues.partnerSince })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        isNotNull(venues.partnerSince),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(venues.partnerSince));
  return rows as PartnerVenue[];
}

// One row per category that currently has a sponsor (sponsorUntil null or in the
// future) -- callers needing "is category X sponsored right now" filter this list
// themselves rather than re-querying per category.
export async function getActiveCategorySponsors(regionIds: number[] | "all"): Promise<CategorySponsor[]> {
  const rows = await db
    .select({
      id: categorySponsors.id,
      regionId: categorySponsors.regionId,
      kind: categorySponsors.kind,
      category: categorySponsors.category,
      sponsorName: categorySponsors.sponsorName,
      sponsorUrl: categorySponsors.sponsorUrl,
      sponsorUntil: categorySponsors.sponsorUntil,
    })
    .from(categorySponsors)
    .where(regionScopeCondition(categorySponsors.regionId, regionIds))
    .orderBy(asc(categorySponsors.kind), asc(categorySponsors.category));
  const now = Date.now();
  return rows.filter((r) => r.sponsorUntil === null || r.sponsorUntil.getTime() > now) as CategorySponsor[];
}

// For the admin category-sponsor panel's region picker -- a manual sponsor grant isn't
// necessarily tied to one of our own venues (sponsorName/sponsorUrl are free text there),
// so unlike every other admin panel here it needs its own explicit region choice rather
// than deriving one from a picked venue.
export async function getRegionOptions(regionIds: number[] | "all"): Promise<RegionOption[]> {
  return db
    .select({ id: regions.id, brandName: regions.brandName })
    .from(regions)
    .where(and(eq(regions.active, true), regionScopeCondition(regions.id, regionIds)))
    .orderBy(asc(regions.brandName));
}

export async function getVenueOptions(regionIds: number[] | "all"): Promise<VenueOption[]> {
  return db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(and(eq(venues.active, true), regionScopeCondition(venues.regionId, regionIds)))
    .orderBy(asc(venues.name));
}

// All active specials, not just one venue's -- cheap enough (id/venueId/title only)
// to ship in full and let the client filter by venue as it's picked, rather than
// adding a round trip per venue selection.
export async function getSpecialOptions(regionIds: number[] | "all"): Promise<SpecialOption[]> {
  return db
    .select({ id: specials.id, venueId: specials.venueId, title: specials.title })
    .from(specials)
    .where(and(isNull(specials.archivedAt), regionScopeCondition(specials.regionId, regionIds)))
    .orderBy(asc(specials.title));
}

// Mirrors getSpecialOptions -- see EventOption's comment on why non-venue events
// (venueId null) are excluded here.
export async function getEventOptions(regionIds: number[] | "all"): Promise<EventOption[]> {
  const rows = await db
    .select({ id: events.id, venueId: events.venueId, title: events.title })
    .from(events)
    .where(
      and(
        isNull(events.archivedAt),
        isNotNull(events.venueId),
        regionScopeCondition(events.regionId, regionIds)
      )
    )
    .orderBy(asc(events.title));
  return rows as EventOption[];
}
