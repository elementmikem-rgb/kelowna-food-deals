import { db, venues, specials } from "@/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { DAY_SLUGS } from "./day-slugs";
import { CATEGORY_SLUGS } from "./category-slugs";

// Town landing pages (/kelowna/west-kelowna): a region often covers several towns, and a search
// like "happy hour West Kelowna" has no page that is clearly about that town. A town gets its own
// page when it has enough venues with live specials to not be thin content.
export const MIN_TOWN_VENUES = 3;
// A town holding most of a region's venues (Calgary inside calgary-nw) would be a near-copy of the
// region page -- duplicate content, so it gets no page of its own.
export const MAX_TOWN_SHARE = 0.8;

// Path segments under /[region]/ that already mean something else.
const RESERVED_SLUGS = new Set<string>([
  ...DAY_SLUGS,
  ...Object.keys(CATEGORY_SLUGS),
  "events",
  "monthly",
  "blog",
  "book",
  "submit",
  "advertise",
  "privacy",
  "saved",
  "tip",
  "venues",
  "verify",
  "archive",
  "claim",
  "map",
]);

export interface Town {
  city: string; // display name, as stored on the venues
  slug: string;
  venueCount: number; // venues in this town with at least one live special
}

export function townSlug(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Pure: turn per-city venue counts into the list of towns that get a page. Cities that differ
// only by case/accents are merged, the region's own name is skipped (the region home page is
// that page), and a slug that collides with an existing path is skipped.
export function pickTowns(
  rows: { city: string | null; venues: number }[],
  regionSlug: string,
  areaName: string
): Town[] {
  const bySlug = new Map<string, Town & { best: number }>();
  for (const r of rows) {
    if (!r.city) continue;
    const slug = townSlug(r.city);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (existing) {
      existing.venueCount += r.venues;
      if (r.venues > existing.best) {
        existing.best = r.venues;
        existing.city = r.city;
      }
    } else {
      bySlug.set(slug, { city: r.city, slug, venueCount: r.venues, best: r.venues });
    }
  }
  const regionName = townSlug(areaName);
  const total = [...bySlug.values()].reduce((n, t) => n + t.venueCount, 0);
  return [...bySlug.values()]
    .filter((t) => t.venueCount >= MIN_TOWN_VENUES)
    .filter((t) => total === 0 || t.venueCount / total <= MAX_TOWN_SHARE)
    .filter((t) => t.slug !== regionSlug && t.slug !== regionName && !RESERVED_SLUGS.has(t.slug))
    .map(({ city, slug, venueCount }) => ({ city, slug, venueCount }))
    .sort((a, b) => b.venueCount - a.venueCount || a.city.localeCompare(b.city));
}

async function cityCounts(regionId?: number) {
  return db
    .select({
      regionId: venues.regionId,
      city: venues.city,
      venues: sql<number>`count(distinct ${venues.id})::int`,
    })
    .from(venues)
    .innerJoin(specials, eq(specials.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        isNull(specials.archivedAt),
        regionId === undefined ? sql`true` : eq(venues.regionId, regionId)
      )
    )
    .groupBy(venues.regionId, venues.city);
}

export async function getTownsForRegion(regionId: number, regionSlug: string, areaName: string): Promise<Town[]> {
  return pickTowns(await cityCounts(regionId), regionSlug, areaName);
}

// One query for every region -- the sitemap lists all town pages, and a query per region
// would add ~100 round trips to a build that already runs close to its time limit.
export async function getTownsByRegion(
  regions: { id: number; slug: string; areaName: string }[]
): Promise<Map<number, Town[]>> {
  const rows = await cityCounts();
  const grouped = new Map<number, { city: string | null; venues: number }[]>();
  for (const r of rows) {
    const list = grouped.get(r.regionId) ?? [];
    list.push({ city: r.city, venues: r.venues });
    grouped.set(r.regionId, list);
  }
  const out = new Map<number, Town[]>();
  for (const reg of regions) out.set(reg.id, pickTowns(grouped.get(reg.id) ?? [], reg.slug, reg.areaName));
  return out;
}
