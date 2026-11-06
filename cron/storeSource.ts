import { db, events, venues, regions } from "@/db";
import { eq, like, sql } from "drizzle-orm";

// Shared by the hall-by-hall event scrapers (eVenue, TixHub, Tessitura ...): each hall is configured with the
// region it belongs to, and each scraper stores its rows under its own `source:<name>` tag, replacing only its own
// previous rows, and keeping them if a run comes back with under half of what was stored.
export interface HallEvent {
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  soldOut?: boolean;
  url: string | null;
}

export interface HallConfig {
  regionSlug: string;
  venueName: string;
  address: string; // street and city, shown when the hall is not one of our own venues
}

export interface HallResult {
  hall: HallConfig;
  events: HallEvent[];
  eventType: (title: string) => (typeof events.$inferInsert)["eventType"];
  describe: (e: HallEvent) => string;
}

const MIN_SHARE_OF_PREVIOUS = 0.5;

export async function storeHallEvents(sourceTag: string, results: HallResult[]): Promise<{ inserted: number }> {
  const regionRows = await db.select({ id: regions.id, slug: regions.slug }).from(regions).where(eq(regions.active, true));
  const regionIdBySlug = new Map(regionRows.map((r) => [r.slug, r.id]));
  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id]));

  const now = new Date();
  const seen = new Set<string>();
  const rows: (typeof events.$inferInsert)[] = [];
  for (const { hall, events: list, eventType, describe } of results) {
    const regionId = regionIdBySlug.get(hall.regionSlug);
    if (regionId === undefined) continue;
    const venueId = venueByRegionAndName.get(`${regionId}|${hall.venueName.toLowerCase()}`) ?? null;
    for (const e of list) {
      const key = `${regionId}|${e.title.toLowerCase()}|${e.date}|${e.time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        venueId,
        regionId,
        locationName: venueId ? null : hall.venueName,
        locationAddress: venueId ? null : hall.address,
        title: e.title,
        description: describe(e),
        eventType: eventType(e.title),
        dayOfWeek: null,
        specificDate: e.date,
        startTime: e.time,
        endTime: null,
        coverChargeCents: null,
        lastVerifiedAt: now,
        sourceUrl: e.url,
        confidence: 0.9,
        extractionNotes: `${sourceTag} | ${e.url ?? ""}`,
      });
    }
  }

  if (rows.length === 0) return { inserted: 0 };
  const [{ n: previous }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(like(events.extractionNotes, `${sourceTag}%`));
  if (previous >= 20 && rows.length < previous * MIN_SHARE_OF_PREVIOUS) {
    console.error(`${sourceTag}: found ${rows.length} vs ${previous} stored; keeping the stored set.`);
    return { inserted: 0 };
  }
  await db.transaction(async (tx) => {
    await tx.delete(events).where(like(events.extractionNotes, `${sourceTag}%`));
    await tx.insert(events).values(rows);
  });
  return { inserted: rows.length };
}

// A date written without a year ("Nov 7") is the next one coming up, allowing a week of slack for an event
// that already started today.
export function dateWithYear(month: number, day: number, today: Date): string {
  const y = today.getUTCFullYear();
  const candidate = (year: number) => new Date(Date.UTC(year, month - 1, day));
  const weekAgo = today.getTime() - 7 * 24 * 3600 * 1000;
  const d = candidate(y).getTime() >= weekAgo ? candidate(y) : candidate(y + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
