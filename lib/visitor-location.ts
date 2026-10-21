import { metersBetween } from "./venue-dedupe";

// Where a visitor is, relative to the region page they are looking at -- so we can count
// travellers (someone in Penticton viewing Kelowna). Comes from Cloudflare's optional
// "visitor location headers" (cf-ipcity, cf-region-code, cf-iplatitude, cf-iplongitude), which
// are IP-based and only good to about a city. Nothing here identifies a person, and only the
// city name, region code and a rounded distance are kept.

export interface VisitorLocation {
  city: string | null;
  region: string | null;
  distanceKm: number | null; // from the visitor to the center of the region page they viewed
}

type HeaderReader = { get(name: string): string | null };

function clean(value: string | null, max: number): string | null {
  if (!value) return null;
  let v = value;
  try {
    v = decodeURIComponent(value);
  } catch {
    // not percent-encoded: use as is
  }
  v = v.trim().slice(0, max);
  return v === "" ? null : v;
}

export function readVisitorLocation(
  headers: HeaderReader,
  regionCenter: { lat: number | null; lng: number | null } | null
): VisitorLocation {
  const city = clean(headers.get("cf-ipcity"), 80);
  const region = clean(headers.get("cf-region-code"), 8);
  const lat = Number.parseFloat(headers.get("cf-iplatitude") ?? "");
  const lng = Number.parseFloat(headers.get("cf-iplongitude") ?? "");
  let distanceKm: number | null = null;
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    regionCenter &&
    regionCenter.lat !== null &&
    regionCenter.lng !== null
  ) {
    distanceKm = Math.round(metersBetween({ lat, lng }, { lat: regionCenter.lat, lng: regionCenter.lng }) / 1000);
  }
  return { city, region, distanceKm };
}

export type Proximity = "here" | "nearby" | "away" | "unknown";

export const HERE_KM = 40; // in the area the page covers
export const NEARBY_KM = 150; // a drive away: the next town over

export function classifyProximity(distanceKm: number | null): Proximity {
  if (distanceKm === null) return "unknown";
  if (distanceKm <= HERE_KM) return "here";
  if (distanceKm <= NEARBY_KM) return "nearby";
  return "away";
}
