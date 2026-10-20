import { db, specials, venues, regions, events, venuePhotos } from "@/db";
import { and, eq, inArray, isNull, isNotNull, gte, lte, or, sql, desc } from "drizzle-orm";
import type { SpecialCategory, EventType } from "@/db/schema";

export interface MapPinSpecial {
  id: number;
  title: string;
  priceCents: number | null;
  startTime: string | null;
  endTime: string | null;
  category: SpecialCategory;
}

export interface MapPin {
  venueId: number;
  venueName: string;
  regionSlug: string;
  lat: number;
  lng: number;
  boosted: boolean;
  // Best-ranked cover photo (owner > Google > visitor), served from /api/venue-photos/[id].
  photoId: number | null;
  specials: MapPinSpecial[];
}

const MAX_PINS = 300;

// One cover-photo id per venue, using the same owner > Google > visitor rank as the
// cards. Selects ids only (never the base64 blobs) and runs once per request over the
// venues already chosen, rather than as a subquery per joined row.
async function topPhotoIds(venueIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (venueIds.length === 0) return out;
  const rows = await db
    .select({ venueId: venuePhotos.venueId, id: venuePhotos.id })
    .from(venuePhotos)
    .where(inArray(venuePhotos.venueId, venueIds))
    .orderBy(
      sql`case ${venuePhotos.source} when 'owner' then 0 when 'google' then 1 else 2 end`,
      desc(venuePhotos.createdAt)
    );
  for (const r of rows) if (!out.has(r.venueId)) out.set(r.venueId, r.id);
  return out;
}

// Powers the map view's cross-region panning (components/MapView.tsx): a
// visitor who zooms out from /kelowna sees venues from Penticton, Vancouver,
// etc. fade in as they pan, without ever loading all 97 regions' venues
// upfront. Scoped by lat/lng bounding box + the same day/category filters
// SpecialsBoard already applies, so panning into another region shows that
// region's Saturday happy hours, not its whole unfiltered venue list --
// consistent with whatever the visitor already filtered to.
export async function getMapPinsInBounds(
  bounds: { north: number; south: number; east: number; west: number },
  dayOfWeek: number,
  category: SpecialCategory | null
): Promise<MapPin[]> {
  const rows = await db
    .select({
      venueId: venues.id,
      venueName: venues.name,
      regionSlug: regions.slug,
      lat: venues.lat,
      lng: venues.lng,
      mapPinBoostedUntil: venues.mapPinBoostedUntil,
      specialId: specials.id,
      specialTitle: specials.title,
      specialPriceCents: specials.priceCents,
      specialStartTime: specials.startTime,
      specialEndTime: specials.endTime,
      specialCategory: specials.category,
    })
    .from(venues)
    .innerJoin(regions, eq(venues.regionId, regions.id))
    .innerJoin(specials, eq(specials.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        eq(regions.active, true),
        eq(venues.approxCoords, false),
        isNotNull(venues.lat),
        isNotNull(venues.lng),
        gte(venues.lat, bounds.south),
        lte(venues.lat, bounds.north),
        gte(venues.lng, bounds.west),
        lte(venues.lng, bounds.east),
        isNull(specials.archivedAt),
        eq(specials.isMonthly, false),
        or(isNull(specials.dayOfWeek), eq(specials.dayOfWeek, dayOfWeek)),
        category ? eq(specials.category, category) : sql`true`
      )
    )
    // Caps at the venue level (below), not here -- a plain row LIMIT could cut a
    // busy venue's specials off mid-list while still counting it as "shown".
    .limit(MAX_PINS * 8);

  const byVenue = new Map<number, MapPin>();
  for (const r of rows) {
    if (r.lat === null || r.lng === null) continue;
    let pin = byVenue.get(r.venueId);
    if (!pin) {
      if (byVenue.size >= MAX_PINS) continue; // dense viewport -- stop adding new venues, existing ones keep filling in
      pin = {
        venueId: r.venueId,
        venueName: r.venueName,
        regionSlug: r.regionSlug,
        lat: r.lat,
        lng: r.lng,
        boosted: r.mapPinBoostedUntil !== null && r.mapPinBoostedUntil.getTime() > Date.now(),
        photoId: null,
        specials: [],
      };
      byVenue.set(r.venueId, pin);
    }
    pin.specials.push({
      id: r.specialId,
      title: r.specialTitle,
      priceCents: r.specialPriceCents,
      startTime: r.specialStartTime,
      endTime: r.specialEndTime,
      category: r.specialCategory,
    });
  }
  const pins = Array.from(byVenue.values());
  const photos = await topPhotoIds(pins.map((p) => p.venueId));
  for (const p of pins) p.photoId = photos.get(p.venueId) ?? null;
  return pins;
}

export interface MapPinEvent {
  id: number;
  title: string;
  coverChargeCents: number | null;
  startTime: string | null;
  endTime: string | null;
  eventType: EventType;
}

export interface EventMapPin {
  venueId: number;
  venueName: string;
  regionSlug: string;
  lat: number;
  lng: number;
  boosted: boolean;
  photoId: number | null;
  events: MapPinEvent[];
}

// Same shape/purpose as getMapPinsInBounds, for the map's Events layer
// (components/MapView.tsx's Specials/Events toggle) -- scoped to recurring
// weekly events only (dayOfWeek set, specificDate null), the same "which day"
// mental model the specials layer and DayTabs already use. One-off
// date-specific events (a single Saturday concert) and location-only events
// with no venueId (no coordinates to plot) are deliberately out of scope for
// this first version -- both would need a genuinely different UI (a date
// picker, not a day-of-week picker) to show correctly.
export async function getEventMapPinsInBounds(
  bounds: { north: number; south: number; east: number; west: number },
  dayOfWeek: number
): Promise<EventMapPin[]> {
  const rows = await db
    .select({
      venueId: venues.id,
      venueName: venues.name,
      regionSlug: regions.slug,
      lat: venues.lat,
      lng: venues.lng,
      mapPinBoostedUntil: venues.mapPinBoostedUntil,
      eventId: events.id,
      eventTitle: events.title,
      eventCoverChargeCents: events.coverChargeCents,
      eventStartTime: events.startTime,
      eventEndTime: events.endTime,
      eventType: events.eventType,
    })
    .from(venues)
    .innerJoin(regions, eq(venues.regionId, regions.id))
    .innerJoin(events, eq(events.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        eq(regions.active, true),
        eq(venues.approxCoords, false),
        isNotNull(venues.lat),
        isNotNull(venues.lng),
        gte(venues.lat, bounds.south),
        lte(venues.lat, bounds.north),
        gte(venues.lng, bounds.west),
        lte(venues.lng, bounds.east),
        isNull(events.archivedAt),
        eq(events.dayOfWeek, dayOfWeek),
        isNull(events.specificDate)
      )
    )
    .limit(MAX_PINS * 8);

  const byVenue = new Map<number, EventMapPin>();
  for (const r of rows) {
    if (r.lat === null || r.lng === null) continue;
    let pin = byVenue.get(r.venueId);
    if (!pin) {
      if (byVenue.size >= MAX_PINS) continue;
      pin = {
        venueId: r.venueId,
        venueName: r.venueName,
        regionSlug: r.regionSlug,
        lat: r.lat,
        lng: r.lng,
        boosted: r.mapPinBoostedUntil !== null && r.mapPinBoostedUntil.getTime() > Date.now(),
        photoId: null,
        events: [],
      };
      byVenue.set(r.venueId, pin);
    }
    pin.events.push({
      id: r.eventId,
      title: r.eventTitle,
      coverChargeCents: r.eventCoverChargeCents,
      startTime: r.eventStartTime,
      endTime: r.eventEndTime,
      eventType: r.eventType,
    });
  }
  const pins = Array.from(byVenue.values());
  const photos = await topPhotoIds(pins.map((p) => p.venueId));
  for (const p of pins) p.photoId = photos.get(p.venueId) ?? null;
  return pins;
}
