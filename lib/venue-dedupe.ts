// "Is this venue already in the database under another spelling?" The bulk imports used to
// compare names only after stripping punctuation, so "Smash Kitchen & Bar" and "Smash Kitchen
// and Bar", "Lakesider Brewing" and "Lakesider Brewing Co.", or "Botanist" and "The Botanist"
// all looked like new venues. This compares names loosely AND uses where the place is (map
// position, website), which a spelling change can't hide. Pure -- no database access.

export interface VenueLite {
  id: number;
  name: string;
  website: string | null;
  lat: number | null;
  lng: number | null;
  regionId?: number | null;
}

export interface DuplicateMatch {
  venue: VenueLite;
  reason: "same-coordinates" | "same-website" | "same-name";
}

// Two records this close together with similar names are the same place.
export const SAME_SPOT_METERS = 15;
// A chain's locations often share one website, so a shared website only counts when the
// records are also essentially in the same spot.
const SAME_SITE_METERS = 100;
// Same normalised name in the same region, with no position to compare, or close by.
const SAME_NAME_METERS = 250;

const GENERIC_WORDS = /\b(the|le|la|les|and|et|co|company|inc|ltd|restaurant|bar|grill|pub|kitchen|cafe)\b/g;

export function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(GENERIC_WORDS, "")
    .replace(/[^a-z0-9]/g, "");
}

// Equal once normalised, or one inside the other and at least 75% of its length -- so
// "Barn Hammer Brewing" matches "Barn Hammer Brewing Company" but "Quails' Gate Winery" does
// not match "Old Vines Restaurant @ Quails' Gate".
export function namesClose(a: string, b: string): boolean {
  const na = normalizeVenueName(a);
  const nb = normalizeVenueName(b);
  if (na.length < 4 || nb.length < 4) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  return long.includes(short) && short.length / long.length >= 0.75;
}

export function websiteHost(url: string | null | undefined): string {
  if (!url) return "";
  return url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#].*$/, "");
}

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// The first existing venue that is very likely the same place as the candidate. Pass null
// lat/lng for a candidate whose coordinates are only a region-center guess -- they must not
// be compared. Existing venues with approximate coordinates should be passed with null too.
export function findLikelyDuplicate(
  candidate: { name: string; website?: string | null; lat: number | null; lng: number | null; regionId?: number | null },
  existing: VenueLite[]
): DuplicateMatch | null {
  const host = websiteHost(candidate.website);
  const hasPos = candidate.lat !== null && candidate.lng !== null;

  for (const v of existing) {
    const vHasPos = v.lat !== null && v.lng !== null;
    const meters =
      hasPos && vHasPos ? metersBetween({ lat: candidate.lat!, lng: candidate.lng! }, { lat: v.lat!, lng: v.lng! }) : null;
    const close = namesClose(candidate.name, v.name);

    if (meters !== null && meters <= SAME_SPOT_METERS && close) return { venue: v, reason: "same-coordinates" };

    if (host !== "" && host === websiteHost(v.website) && meters !== null && meters <= SAME_SITE_METERS && close) {
      return { venue: v, reason: "same-website" };
    }

    const sameRegion = candidate.regionId != null && candidate.regionId === v.regionId;
    if (close && sameRegion && (meters === null || meters <= SAME_NAME_METERS)) {
      return { venue: v, reason: "same-name" };
    }
  }
  return null;
}
