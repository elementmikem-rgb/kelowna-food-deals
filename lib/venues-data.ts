import { db, venues, specials, events } from "@/db";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import type { SpecialWithVenue, PreviousSpecial } from "./data";
import type { EventWithVenue } from "./events-data";

export interface VenueDetail {
  id: number;
  name: string;
  address: string;
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
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(and(eq(specials.venueId, venueId), isNotNull(specials.archivedAt)))
    .orderBy(desc(specials.archivedAt))
    .limit(15);

  return rows as PreviousSpecial[];
}

export async function getVenueEvents(venueId: number): Promise<EventWithVenue[]> {
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
    .where(and(eq(events.venueId, venueId), isNull(events.archivedAt)));

  return rows as EventWithVenue[];
}
