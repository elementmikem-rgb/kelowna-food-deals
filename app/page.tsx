import Link from "next/link";
import Image from "next/image";
import { db, regions, specials, venues } from "@/db";
import { eq, asc, and, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function CityPickerPage() {
  const activeRegions = await db
    .select({
      slug: regions.slug,
      brandName: regions.brandName,
      logoUrl: regions.logoUrl,
      accentColor: regions.accentColor,
    })
    .from(regions)
    .where(eq(regions.active, true))
    .orderBy(asc(regions.brandName));

  // A live count is the fastest way to prove "checked daily" to a visitor who
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
        <h1 className="font-display text-3xl sm:text-4xl text-foreground">TodaysTab</h1>
        <p className="text-muted">
          Every deal checked by hand, every day — no scraped listings, no guesswork. Pick your city.
        </p>
        {specialCount > 0 && (
          <p className="text-xs uppercase tracking-wide text-muted-2 font-medium">
            {specialCount} special{specialCount === 1 ? "" : "s"} across {venueCount} venue
            {venueCount === 1 ? "" : "s"} in {activeRegions.length} cit
            {activeRegions.length === 1 ? "y" : "ies"} right now
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {activeRegions.map((region) => (
          <Link
            key={region.slug}
            href={`/${region.slug}`}
            className="press-pill flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 hover:border-muted transition-colors"
          >
            <span
              className="flex items-center justify-center rounded-full p-0.5"
              style={{ boxShadow: `0 0 0 2px ${region.accentColor}` }}
            >
              <Image
                src={region.logoUrl}
                alt={`${region.brandName} logo`}
                width={40}
                height={40}
                className="rounded-full w-10 h-10"
              />
            </span>
            <span className="font-display text-lg text-foreground">{region.brandName}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 max-w-2xl text-left pt-4 border-t border-border/70">
        <div className="flex-1 flex flex-col gap-1">
          <span className="font-display text-lg text-foreground">1. We check, not scrape</span>
          <span className="text-sm text-muted">
            A real person reads every menu and happy-hour board — no stale social posts, no guessed hours.
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
