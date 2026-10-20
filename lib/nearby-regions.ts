import { db, regions } from "@/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { metersBetween } from "./venue-dedupe";

export interface NearbyRegion {
  slug: string;
  brandName: string;
  km: number;
}

export const NEARBY_MAX_KM = 90;
export const NEARBY_LIMIT = 6;

// Pure: the regions closest to `current`, nearest first, within a travelling distance. Gives each
// region page real links to the neighbouring ones (Penticton <-> Kelowna <-> Vernon), which helps
// a visitor planning a trip and gives search engines a clear picture of how the areas connect.
export function nearestRegions(
  current: { slug: string; lat: number | null; lng: number | null },
  all: { slug: string; brandName: string; lat: number | null; lng: number | null }[],
  maxKm = NEARBY_MAX_KM,
  limit = NEARBY_LIMIT
): NearbyRegion[] {
  if (current.lat === null || current.lng === null) return [];
  const here = { lat: current.lat, lng: current.lng };
  const out: NearbyRegion[] = [];
  for (const r of all) {
    if (r.slug === current.slug || r.lat === null || r.lng === null) continue;
    const km = metersBetween(here, { lat: r.lat, lng: r.lng }) / 1000;
    if (km <= maxKm) out.push({ slug: r.slug, brandName: r.brandName, km });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, limit);
}

export async function getNearbyRegions(current: {
  slug: string;
  lat: number | null;
  lng: number | null;
}): Promise<NearbyRegion[]> {
  if (current.lat === null || current.lng === null) return [];
  const all = await db
    .select({ slug: regions.slug, brandName: regions.brandName, lat: regions.lat, lng: regions.lng })
    .from(regions)
    .where(and(eq(regions.active, true), isNotNull(regions.lat), isNotNull(regions.lng)));
  return nearestRegions(current, all);
}
