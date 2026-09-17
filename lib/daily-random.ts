// Deterministic per-(day, venue) pseudo-random value in [0, 1) -- same venue gets the
// same value all day (no flicker on refresh), a different value tomorrow (no venue
// permanently owns a position). Used as the tiebreaker among unpaid/unboosted venues on
// both the specials and events boards, replacing "earliest start time": that old
// tiebreaker never changes for a given venue, so a venue with an 11am item ranked above
// one starting at 3pm every single day forever -- a real, free, permanent advantage that
// undercut the whole point of paying for Featured.
export function dailyRandom(venueId: number, dateStr: string): number {
  const str = `${dateStr}:${venueId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) / 0xffffffff;
}
