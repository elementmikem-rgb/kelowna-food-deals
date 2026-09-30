"use client";

// Client-side "already tapped" gate for the interest button (components/EventInterestButton.tsx)
// -- same localStorage pattern as lib/saved-venues.ts, but this is purely a UX gate (hide the
// tap option, show "You're interested" instead); the real anti-abuse control is the API route's
// own per-IP rate limit, since a cleared browser could otherwise tap again.
const STORAGE_KEY = "todaystab_interested_events";

function readAll(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isInterested(eventId: number): boolean {
  return readAll().includes(eventId);
}

export function markInterested(eventId: number): void {
  try {
    const all = readAll();
    if (!all.includes(eventId)) {
      all.push(eventId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch {
    // Storage blocked -- the tap still counted server-side, just won't persist the
    // gate across a reload this time.
  }
}
