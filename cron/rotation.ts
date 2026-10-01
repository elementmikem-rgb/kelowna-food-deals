// A region's nightly cron cost scales with how many venues it re-checks, and
// checking every venue in every region every night (97 regions, ~1,331 active
// venues total) is real, avoidable spend pre-revenue -- see the 2026-09-18
// cost investigation. Instead of a binary "run this region tonight or not"
// (which fully starves quiet regions for stretches), each region checks a
// capped FRACTION of its own venues every night, using the ordering
// getActiveVenues already provides (least-recently-scraped, and therefore
// never-scraped, first) -- so a big region rotates through itself over a few
// nights instead of being scraped in full every single night.
export interface CadenceTier {
  minActiveVenues: number;
  cadenceDays: number;
}

// Checked descending by minActiveVenues in cadenceDaysFor -- first match wins.
//
// 2026-10-01: stretched every tier to 7 days (was 3 days for any region with 11+ active
// venues). The platform has grown past the point where the old tiering still did
// anything -- every one of the 97 active regions now has 11+ active venues, so the old
// "small regions already cheap, stretch to weekly" tier never fired for anyone and the
// whole platform was effectively on a flat 3-day cadence (928 checks/night). A real
// happy-hour/specials schedule rarely changes week to week, so weekly-everywhere is a
// deliberate cost/freshness tradeoff, not an oversight -- see the 2026-10-01 cost
// investigation. Mike's call: "each venue only needs to be checked once a week at the
// moment." Site copy updated to match the same day (now reads "checked regularly"
// across the homepage, SEO descriptions, region/category pages, and About section).
export const CADENCE_TIERS: CadenceTier[] = [{ minActiveVenues: 0, cadenceDays: 7 }];

export function cadenceDaysFor(activeVenueCount: number): number {
  const tier = CADENCE_TIERS.find((t) => activeVenueCount >= t.minActiveVenues);
  // CADENCE_TIERS always has a minActiveVenues: 0 entry, so this never actually falls through.
  return tier?.cadenceDays ?? 1;
}

// venueList must already be ordered oldest-checked-first (getActiveVenues's
// contract) -- never-scraped venues sort first, so they're always inside the
// returned slice regardless of tier, with no separate "new venue" exception.
export function venuesToScrapeTonight<V>(venueList: V[]): V[] {
  if (venueList.length === 0) return venueList;
  const cadenceDays = cadenceDaysFor(venueList.length);
  const cap = Math.ceil(venueList.length / cadenceDays);
  return venueList.slice(0, cap);
}
