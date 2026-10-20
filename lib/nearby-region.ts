import { haversineKm, type Point } from "./nearest";

export interface GeoRegion {
  slug: string;
  brandName: string;
  lat: number;
  lng: number;
}

// Beyond this, no region is a real "you are here" match.
export const MAX_MATCH_KM = 100;
// A visitor this close to the region they're viewing is "in" it -- Peachland sits ~21km
// from Kelowna's center and shouldn't be nagged to switch.
export const STAY_WITHIN_KM = 30;

// The region to offer when a visitor's position clearly puts them somewhere other than
// the region they're viewing, else null. Pure: the position is only ever an argument.
export function suggestRegion(
  position: Point,
  regions: GeoRegion[],
  currentSlug: string
): GeoRegion | null {
  const ranked = regions
    .map((r) => ({ region: r, km: haversineKm(position, r) }))
    .sort((a, b) => a.km - b.km);
  const nearest = ranked[0];
  if (!nearest || nearest.km > MAX_MATCH_KM) return null;
  if (nearest.region.slug === currentSlug) return null;
  const current = ranked.find((r) => r.region.slug === currentSlug);
  // Unknown current region (no coordinates): the nearest match is still a fair offer.
  if (current && current.km <= STAY_WITHIN_KM) return null;
  return nearest.region;
}
