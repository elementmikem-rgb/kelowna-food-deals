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
export const CADENCE_TIERS: CadenceTier[] = [
  { minActiveVenues: 30, cadenceDays: 3 }, // Kelowna, Penticton today: a third a night.
  { minActiveVenues: 11, cadenceDays: 3 },
  { minActiveVenues: 0, cadenceDays: 7 }, // small regions: already cheap, stretch to weekly.
];

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
