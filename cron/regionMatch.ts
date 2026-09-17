import { db, venues } from "@/db";
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
