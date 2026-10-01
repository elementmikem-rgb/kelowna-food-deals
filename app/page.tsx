import { db, regions, provinces, specials, venues } from "@/db";
import { eq, asc, and, isNull, isNotNull, sql } from "drizzle-orm";
import CityFinder from "@/components/CityFinder";

export const dynamic = "force-dynamic";

export default async function CityPickerPage() {
  const activeRegions = await db
    .select({
      slug: regions.slug,
      brandName: regions.brandName,
      logoUrl: regions.logoUrl,
      accentColor: regions.accentColor,
      provinceName: provinces.name,
      provinceCode: provinces.code,
      lat: regions.lat,
      lng: regions.lng,
    })
    .from(regions)
    .innerJoin(provinces, eq(regions.provinceId, provinces.id))
    .where(eq(regions.active, true))
    .orderBy(asc(provinces.name), asc(regions.brandName));

  // Every distinct town a region's own venues are actually in (Kelowna region
  // covers West Kelowna, Lake Country, Peachland, etc. -- see CityFilter).
  // The homepage search needs this too, or a visitor searching "West Kelowna"
  // gets told the site doesn't cover them when it very much does -- it's just
  // filed under the parent region, not its own region.
  const cityRows = await db
    .selectDistinct({ regionId: venues.regionId, city: venues.city })
    .from(venues)
    .where(and(eq(venues.active, true), sql`${venues.city} is not null`));
  const citiesByRegionId = new Map<number, string[]>();
  for (const row of cityRows) {
    if (!row.city) continue;
    if (!citiesByRegionId.has(row.regionId)) citiesByRegionId.set(row.regionId, []);
    citiesByRegionId.get(row.regionId)!.push(row.city);
  }
  const regionIdBySlug = await db
    .select({ id: regions.id, slug: regions.slug })
    .from(regions)
    .where(eq(regions.active, true));
  const cityAliasesBySlug = new Map(
    regionIdBySlug.map(({ id, slug }) => [slug, citiesByRegionId.get(id) ?? []])
  );

  // Per-region special count for the city-picker cards -- every region's shared
  // generic app icon (regions.logoUrl is the same file for all 97 today) gave every
  // card identical visuals, so a live "N specials tonight" stat plus the region's own
  // accentColor is what actually differentiates one card from the next now.
  const specialCountRows = await db
    .select({
      regionId: venues.regionId,
      specialCount: sql<number>`count(distinct ${specials.id})`,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(and(eq(venues.active, true), isNull(specials.archivedAt)))
    .groupBy(venues.regionId);
  const specialCountByRegionId = new Map(specialCountRows.map((r) => [r.regionId, r.specialCount]));
  const specialCountBySlug = new Map(
    regionIdBySlug.map(({ id, slug }) => [slug, specialCountByRegionId.get(id) ?? 0])
  );

  // A live count is the fastest way to prove "checked regularly" to a visitor who
  // has never heard of the site before -- cheap enough to run on every request
  // (two integers, no rows returned) that it doesn't need its own cache.
  const [{ specialCount, venueCount }] = await db
    .select({
      specialCount: sql<number>`count(distinct ${specials.id})`,
      venueCount: sql<number>`count(distinct ${specials.venueId})`,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .innerJoin(regions, eq(venues.regionId, regions.id))
    .where(and(eq(venues.active, true), eq(regions.active, true), isNull(specials.archivedAt)));

  return (
    <div className="flex flex-col flex-1 items-center px-4 py-14 sm:py-20 gap-10 text-center">
      <div className="flex flex-col gap-3 max-w-md">
        <h1 className="font-display text-4xl sm:text-5xl text-foreground">
          <span className="hand-underline">Todays</span>Tab
        </h1>
        <p className="text-muted">
          Every listing pulled straight from the venue&apos;s own site, checked regularly — no stale
          social posts, no guessing. Pick your city.
        </p>
        {specialCount > 0 && (
          <div className="flex justify-center">
            <span className="pill-soft px-3 py-1.5 text-[11px] font-medium">
              {specialCount} special{specialCount === 1 ? "" : "s"} · {venueCount} venue
              {venueCount === 1 ? "" : "s"} · {activeRegions.length} cit
              {activeRegions.length === 1 ? "y" : "ies"} right now
            </span>
          </div>
        )}
      </div>

      <CityFinder
        regions={activeRegions.map((r) => ({
          ...r,
          cities: cityAliasesBySlug.get(r.slug) ?? [],
          specialCount: specialCountBySlug.get(r.slug) ?? 0,
        }))}
      />

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 max-w-2xl text-left pt-4 border-t border-border/70">
        <div className="flex-1 flex flex-col gap-1">
          <span className="font-display text-lg text-foreground">1. Straight from the source</span>
          <span className="text-sm text-muted">
            Every listing comes from the venue&apos;s own website or menu, checked regularly — never
            copied from an old social post or a stale directory.
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <span className="font-display text-lg text-foreground">2. Stamped when verified</span>
          <span className="text-sm text-muted">
            Every listing shows exactly when it was last confirmed, so you know it&apos;s not out of date.
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <span className="font-display text-lg text-foreground">3. You keep it honest</span>
          <span className="text-sm text-muted">
            Spot something off? Confirm or report it in one tap — the board updates from real visits.
          </span>
        </div>
      </div>
    </div>
  );
}
