"use client";

// Saved venues ("My Spots") -- localStorage-only MVP, no visitor account system
// exists yet (see the feature scoping this shipped from). This means it never
// syncs across devices and clears with the browser's site data, but it ships
// today with zero new backend/auth work. Cross-region on purpose (a visitor who
// saves a Kelowna spot and later browses Penticton should still see it) rather
// than scoped per-region, so a single key covers everywhere the site runs.
const STORAGE_KEY = "todaystab_saved_venues";

export interface SavedVenue {
  venueId: number;
  venueName: string;
  regionSlug: string;
  savedAt: number;
}

function readAll(): SavedVenue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // private browsing / blocked storage / corrupt JSON -- fail to empty, not a crash
  }
}

function writeAll(venues: SavedVenue[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
  } catch {
    // Storage blocked or full -- the toggle just won't persist this time, nothing to
    // recover from client-side.
  }
}

export function getSavedVenues(): SavedVenue[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function isVenueSaved(venueId: number): boolean {
  return readAll().some((v) => v.venueId === venueId);
}

// Returns the new saved state (true = now saved) so callers can update their own
// UI without a second isVenueSaved lookup.
export function toggleSavedVenue(venue: { venueId: number; venueName: string; regionSlug: string }): boolean {
  const all = readAll();
  const existing = all.findIndex((v) => v.venueId === venue.venueId);
  if (existing >= 0) {
    all.splice(existing, 1);
    writeAll(all);
    return false;
  }
  all.push({ ...venue, savedAt: Date.now() });
  writeAll(all);
  return true;
}
