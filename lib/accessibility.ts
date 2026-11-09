// Visitor-confirmed accessibility notes for a venue (wheelchair users, strollers, walkers).
// The site never states that a place is accessible. It only reports what enough visitors
// confirmed, and shows nothing when there is not enough agreement. Absence is never shown as "not accessible".

export const ACCESS_FEATURES = ["entrance", "space", "washroom"] as const;
export type AccessFeature = (typeof ACCESS_FEATURES)[number];

export const ACCESS_ANSWERS = ["yes", "no", "unsure"] as const;
export type AccessAnswer = (typeof ACCESS_ANSWERS)[number];

// Yes votes (from different browsers) a feature needs before its line appears.
export const ACCESS_MIN_YES = 3;
// Votes older than this stop counting, so a ramp that was removed does not stay confirmed forever (about 18 months).
export const ACCESS_MAX_AGE_DAYS = 548;

// On for every region. Kept as a function so one place decides, should a region ever need it off.
export const accessibilityEnabled = (regionSlug: string) => regionSlug.length > 0;

export type AccessVote = { token: string; feature: AccessFeature; answer: AccessAnswer; createdAt: Date };
export type AccessShown = { feature: AccessFeature; confirmedBy: number };

const DAY_MS = 86_400_000;

export function rollupAccessibility(votes: AccessVote[], now: Date = new Date()): { shown: AccessShown[] } {
  const cutoff = now.getTime() - ACCESS_MAX_AGE_DAYS * DAY_MS;
  // One vote per browser per feature: the most recent unexpired one wins.
  const latest = new Map<string, AccessVote>();
  for (const v of votes) {
    if (v.createdAt.getTime() < cutoff) continue;
    const key = `${v.feature}:${v.token}`;
    const prev = latest.get(key);
    if (!prev || v.createdAt.getTime() > prev.createdAt.getTime()) latest.set(key, v);
  }
  const tally = new Map<AccessFeature, { yes: number; no: number }>();
  for (const v of latest.values()) {
    const t = tally.get(v.feature) ?? { yes: 0, no: 0 };
    if (v.answer === "yes") t.yes++;
    else if (v.answer === "no") t.no++;
    tally.set(v.feature, t);
  }
  const shown: AccessShown[] = [];
  for (const feature of ACCESS_FEATURES) {
    const t = tally.get(feature);
    if (t && t.yes >= ACCESS_MIN_YES && t.no <= t.yes) shown.push({ feature, confirmedBy: t.yes });
  }
  return { shown };
}

// Venues with at least one confirmed feature, for the "Accessible" filter on the board.
export function accessibleVenueIds(votes: (AccessVote & { venueId: number })[], now: Date = new Date()): number[] {
  const byVenue = new Map<number, AccessVote[]>();
  for (const v of votes) {
    const list = byVenue.get(v.venueId);
    if (list) list.push(v);
    else byVenue.set(v.venueId, [v]);
  }
  const ids: number[] = [];
  for (const [venueId, list] of byVenue) {
    if (rollupAccessibility(list, now).shown.length > 0) ids.push(venueId);
  }
  return ids;
}
