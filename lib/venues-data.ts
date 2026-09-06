import { db, venues, specials, events, venuePhotos, menuItems } from "@/db";
import { and, desc, eq, isNull, isNotNull, or, gte } from "drizzle-orm";
import type { SpecialWithVenue, PreviousSpecial } from "./data";
import type { EventWithVenue } from "./events-data";
import { pacificTodayISODate } from "./time";

export interface VenueDetail {
  id: number;
  name: string;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  menuUrl: string | null;
  instagramHandle: string | null;
}

export async function getVenueById(id: number): Promise<VenueDetail | null> {
  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      lat: venues.lat,
      lng: venues.lng,
      phone: venues.phone,
      website: venues.website,
      menuUrl: venues.menuUrl,
      instagramHandle: venues.instagramHandle,
    })
    .from(venues)
    .where(and(eq(venues.id, id), eq(venues.active, true)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getVenueSpecials(venueId: number): Promise<SpecialWithVenue[]> {
  const rows = await db
    .select({
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
      venuePartnerSince: venues.partnerSince,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt)));

  return rows as SpecialWithVenue[];
}

export async function getVenuePreviousSpecials(venueId: number): Promise<PreviousSpecial[]> {
  const rows = await db
    .select({
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
      archivedAt: specials.archivedAt,
      venueFeaturedUntil: venues.featuredUntil,
      boostedUntil: specials.boostedUntil,
      venuePartnerSince: venues.partnerSince,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(and(eq(specials.venueId, venueId), isNotNull(specials.archivedAt)))
    .orderBy(desc(specials.archivedAt))
    .limit(15);

  return rows as PreviousSpecial[];
}

export interface VenuePhoto {
  id: number;
  caption: string | null;
}

// Only id + caption — the actual image bytes are served from
// /api/venue-photos/[id] so the page HTML doesn't inline base64 blobs.
export async function getVenuePhotos(venueId: number): Promise<VenuePhoto[]> {
  const rows = await db
    .select({
      id: venuePhotos.id,
      caption: venuePhotos.caption,
    })
    .from(venuePhotos)
    .where(eq(venuePhotos.venueId, venueId))
    .orderBy(desc(venuePhotos.createdAt));

  return rows;
}

export interface VenueMenuItem {
  id: number;
  name: string;
  description: string | null;
  priceCents: number | null;
}

export async function getVenueMenuItems(venueId: number): Promise<VenueMenuItem[]> {
  const rows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      description: menuItems.description,
      priceCents: menuItems.priceCents,
    })
    .from(menuItems)
    .where(and(eq(menuItems.venueId, venueId), isNull(menuItems.archivedAt)))
    .orderBy(desc(menuItems.lastVerifiedAt));

  return rows;
}

export async function getVenueEvents(venueId: number): Promise<EventWithVenue[]> {
  const today = pacificTodayISODate();
  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      dayOfWeek: events.dayOfWeek,
      specificDate: events.specificDate,
      startTime: events.startTime,
      endTime: events.endTime,
      coverChargeCents: events.coverChargeCents,
      lastVerifiedAt: events.lastVerifiedAt,
      confidence: events.confidence,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(events.venueId, venueId),
        isNull(events.archivedAt),
        // Recurring events (specificDate null) always show; one-off events only show
        // until their date passes -- otherwise an expired concert renders as current
        // forever, since nothing else in the app archives a one-off event by date.
        or(isNull(events.specificDate), gte(events.specificDate, today))
      )
    );

  return rows as EventWithVenue[];
}
