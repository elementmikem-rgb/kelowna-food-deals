import { haversineKm } from "./nearest";

export interface StripBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export const MAX_STRIP_VENUES = 30;

// The venues for the map's bottom card strip: those inside the current view, nearest the
// center first, capped. The selected venue is always kept so its card can't vanish while
// it's being looked at. With no view yet (first render) it falls back to the first pins.
export function pickStripPins<T extends { venueId: number; lat: number; lng: number }>(
  pins: T[],
  view: { center: { lat: number; lng: number }; bounds: StripBounds } | null,
  selectedId: number | null,
  limit = MAX_STRIP_VENUES
): T[] {
  if (!view) return pins.slice(0, limit);
  const { center, bounds } = view;
  const inView = pins.filter(
    (p) => p.lat <= bounds.north && p.lat >= bounds.south && p.lng <= bounds.east && p.lng >= bounds.west
  );
  const ordered = inView
    .map((p) => ({ p, km: haversineKm(center, p) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((x) => x.p);
  if (selectedId !== null && !ordered.some((p) => p.venueId === selectedId)) {
    const selected = pins.find((p) => p.venueId === selectedId);
    if (selected) ordered.unshift(selected);
  }
  return ordered;
}
