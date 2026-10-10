// "Sort by nearest" support for the specials list. Pure functions, no browser or database access,
// so they can be tested and used from client components. The visitor's own position never leaves
// their browser -- it is only ever passed into these functions.

export interface Point {
  lat: number;
  lng: number;
}

export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Nearest first. Items with no usable point (no coordinates, or only the region's center point as a
// stand-in) go last in their original order and carry no distance, so we never claim a distance we
// don't actually know. Returns a new array; the input is untouched.
export function sortByDistance<T>(
  items: T[],
  getPoint: (item: T) => Point | null,
  origin: Point
): Array<{ item: T; distanceKm: number | null }> {
  const measured: Array<{ item: T; distanceKm: number; index: number }> = [];
  const unknown: Array<{ item: T; distanceKm: null }> = [];
  items.forEach((item, index) => {
    const p = getPoint(item);
    if (p === null) unknown.push({ item, distanceKm: null });
    else measured.push({ item, distanceKm: haversineKm(origin, p), index });
  });
  measured.sort((a, b) => a.distanceKm - b.distanceKm || a.index - b.index);
  return [...measured.map(({ item, distanceKm }) => ({ item, distanceKm })), ...unknown];
}

// "450 m" under a kilometre (rounded to 50 so it doesn't look falsely precise), "1.2 km" under 10 km,
// whole kilometres beyond that. French uses a decimal comma.
export function formatDistance(km: number, lang: "en" | "fr" | string): string {
  if (km < 1) {
    const metres = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${metres} m`;
  }
  if (km < 10) {
    const s = (Math.round(km * 10) / 10).toFixed(1);
    return `${lang === "fr" ? s.replace(".", ",") : s} km`;
  }
  return `${Math.round(km)} km`;
}
