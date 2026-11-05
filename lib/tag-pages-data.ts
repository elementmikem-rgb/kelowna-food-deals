import { db, specials, venues } from "@/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { tagPageSlugs } from "./tag-pages";
import type { TaggableSpecial } from "./special-tags";

// Which tag landing pages a region qualifies for (see lib/tag-pages.ts). One query for any set of regions.
export async function getTagPageSlugsByRegion(regionIds: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (regionIds.length === 0) return out;
  const rows = await db
    .select({ regionId: venues.regionId, title: specials.title, description: specials.description, category: specials.category })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(and(eq(venues.active, true), isNull(specials.archivedAt), eq(specials.isMonthly, false), inArray(venues.regionId, regionIds)));
  const byRegion = new Map<number, TaggableSpecial[]>();
  for (const r of rows) {
    if (r.regionId === null) continue;
    const list = byRegion.get(r.regionId) ?? [];
    list.push({ title: r.title, description: r.description, category: r.category });
    byRegion.set(r.regionId, list);
  }
  for (const id of regionIds) out.set(id, tagPageSlugs(byRegion.get(id) ?? []));
  return out;
}

export async function getTagPageSlugsForRegion(regionId: number): Promise<string[]> {
  return (await getTagPageSlugsByRegion([regionId])).get(regionId) ?? [];
}
