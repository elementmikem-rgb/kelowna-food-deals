import { db, venues, specials, categorySponsors } from "@/db";
import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import type { SpecialCategory } from "@/db/schema";

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
  category: SpecialCategory;
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

export interface VenueOption {
  id: number;
  name: string;
}

export interface SpecialOption {
  id: number;
  venueId: number;
  title: string;
}

export async function getFeaturedVenues(): Promise<FeaturedVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, featuredUntil: venues.featuredUntil })
    .from(venues)
    .where(and(eq(venues.active, true), gt(venues.featuredUntil, new Date())))
    .orderBy(asc(venues.featuredUntil));
  return rows as FeaturedVenue[];
}

export async function getBoostedSpecials(): Promise<BoostedSpecial[]> {
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
    .where(and(isNull(specials.archivedAt), gt(specials.boostedUntil, new Date())))
    .orderBy(asc(specials.boostedUntil));
  return rows as BoostedSpecial[];
}

export async function getPartnerVenues(): Promise<PartnerVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, partnerSince: venues.partnerSince })
    .from(venues)
    .where(and(eq(venues.active, true), isNotNull(venues.partnerSince)))
    .orderBy(asc(venues.partnerSince));
  return rows as PartnerVenue[];
}

// One row per category that currently has a sponsor (sponsorUntil null or in the
// future) -- callers needing "is category X sponsored right now" filter this list
// themselves rather than re-querying per category.
export async function getActiveCategorySponsors(): Promise<CategorySponsor[]> {
  const rows = await db
    .select({
      id: categorySponsors.id,
      category: categorySponsors.category,
      sponsorName: categorySponsors.sponsorName,
      sponsorUrl: categorySponsors.sponsorUrl,
      sponsorUntil: categorySponsors.sponsorUntil,
    })
    .from(categorySponsors)
    .orderBy(asc(categorySponsors.category));
  const now = Date.now();
  return rows.filter((r) => r.sponsorUntil === null || r.sponsorUntil.getTime() > now) as CategorySponsor[];
}

export async function getVenueOptions(): Promise<VenueOption[]> {
  return db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(eq(venues.active, true))
    .orderBy(asc(venues.name));
}

// All active specials, not just one venue's -- cheap enough (id/venueId/title only)
// to ship in full and let the client filter by venue as it's picked, rather than
// adding a round trip per venue selection.
export async function getSpecialOptions(): Promise<SpecialOption[]> {
  return db
    .select({ id: specials.id, venueId: specials.venueId, title: specials.title })
    .from(specials)
    .where(isNull(specials.archivedAt))
    .orderBy(asc(specials.title));
}
