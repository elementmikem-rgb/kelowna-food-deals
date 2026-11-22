// Admin inbox thread keys: "v{venueId}" for a venue-matched thread,
// "u{encodeURIComponent(email)}" for an unmatched sender. Kept separate from
// lib/inbox-data.ts (which imports the db) so it is unit-testable.

export function threadKeyFor(venueId: number | null, email: string): string {
  return venueId !== null ? `v${venueId}` : `u${encodeURIComponent(email)}`;
}

export type ParsedThreadKey = { type: "venue"; venueId: number } | { type: "email"; email: string };

export function parseThreadKey(key: string): ParsedThreadKey | null {
  if (key.startsWith("v")) {
    const venueId = Number(key.slice(1));
    return Number.isInteger(venueId) ? { type: "venue", venueId } : null;
  }
  if (key.startsWith("u")) return { type: "email", email: decodeURIComponent(key.slice(1)) };
  return null;
}
