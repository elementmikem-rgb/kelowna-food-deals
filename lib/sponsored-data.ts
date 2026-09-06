import { db, venues, specials } from "@/db";
import { and, asc, eq, gt, isNull } from "drizzle-orm";

export interface FeaturedVenue {
  id: number;
  name: string;
  featuredUntil: Date;
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
