import { db, venues, regions } from "@/db";
import { eq, isNotNull, and } from "drizzle-orm";

// Shared by every GLOBAL (not region-scoped) event source -- Castanet, 604Now,
// ... -- that has no region of its own to attribute an event to up front. One
// matcher per active region, built from that region's own active venues' city
// names (e.g. Kelowna -> kelowna/west kelowna/peachland/lake country; Langley
// -> langley/aldergrove), not a single hardcoded list, so an event gets
// attributed to whichever region it's actually in, and a newly added
// satellite town is picked up automatically the next time this runs, with no
// code change needed.
export async function buildRegionCityMatchers(): Promise<Map<number, RegExp>> {
  const rows = await db
    .selectDistinct({ regionId: venues.regionId, city: venues.city })
    .from(venues)
    .where(and(eq(venues.active, true), isNotNull(venues.city)));

  const citiesByRegion = new Map<number, Set<string>>();
  for (const row of rows) {
    if (!row.city) continue;
    const set = citiesByRegion.get(row.regionId) ?? new Set<string>();
    set.add(row.city.toLowerCase());
    citiesByRegion.set(row.regionId, set);
  }

  const matchers = new Map<number, RegExp>();
  for (const [regionId, cities] of citiesByRegion) {
    if (cities.size === 0) continue;
    const escaped = Array.from(cities).map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    matchers.set(regionId, new RegExp(`\\b(${escaped.join("|")})\\b`, "i"));
  }
  return matchers;
}

// Ambiguous (matches more than one region -- shouldn't happen since two
// regions' city sets don't overlap today) or unmatched (a location the source
// listed that isn't any tracked region's city) both return null -- skip the
// event rather than guess.
export function matchRegionForLocation(
  locationLine: string,
  matchers: Map<number, RegExp>
): number | null {
  let matched: number | null = null;
  for (const [regionId, re] of matchers) {
    if (re.test(locationLine)) {
      if (matched !== null) return null;
      matched = regionId;
    }
  }
  return matched;
}

// ---------------------------------------------------------------------------------------------------------
// Matching by an exact city name instead of searching a whole address. Used by sources that hand over the city
// as its own field (Showpass): "North Vancouver" must not be read as "Vancouver", and a city split across
// several regions (Calgary, Edmonton, Toronto) goes to whichever region's centre is nearest the event.

export interface RegionCityIndex {
  cities: Map<number, Set<string>>;
  centers: Map<number, { lat: number; lng: number }>;
}

const normCity = (c: string) =>
  c
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export async function buildRegionCityIndex(): Promise<RegionCityIndex> {
  const rows = await db
    .selectDistinct({ regionId: venues.regionId, city: venues.city })
    .from(venues)
    .where(and(eq(venues.active, true), isNotNull(venues.city)));
  const cities = new Map<number, Set<string>>();
  for (const r of rows) {
    if (!r.city) continue;
    const set = cities.get(r.regionId) ?? new Set<string>();
    set.add(normCity(r.city));
    cities.set(r.regionId, set);
  }
  const centers = new Map<number, { lat: number; lng: number }>();
  const regs = await db.select({ id: regions.id, lat: regions.lat, lng: regions.lng }).from(regions).where(eq(regions.active, true));
  for (const r of regs) if (r.lat != null && r.lng != null) centers.set(r.id, { lat: r.lat, lng: r.lng });
  return { cities, centers };
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// "49.2797,-123.1216" (Showpass's own format) -> a point, or null.
export function parsePosition(text: string | null | undefined): { lat: number; lng: number } | null {
  const m = text?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

export function matchRegionByCity(
  city: string,
  position: { lat: number; lng: number } | null,
  index: RegionCityIndex
): number | null {
  const key = normCity(city);
  if (!key) return null;
  const candidates = [...index.cities].filter(([, set]) => set.has(key)).map(([id]) => id);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  if (!position) return null;
  let best: { id: number; km: number } | null = null;
  for (const id of candidates) {
    const c = index.centers.get(id);
    if (!c) continue;
    const km = distanceKm(position, c);
    if (!best || km < best.km) best = { id, km };
  }
  return best ? best.id : null;
}
