import type { MetadataRoute } from "next";
import { db, venues, specials, regions } from "@/db";
import { and, eq, isNull, max } from "drizzle-orm";
import { BLOG_POSTS } from "@/lib/blog-data";

// Without this, Next prerenders the sitemap once at build time and it never
// regenerates -- venues added by the nightly cron wouldn't appear until the
// next deploy, and lastModified would freeze to the build timestamp forever.
export const revalidate = 3600;

const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

// One combined sitemap for the whole consolidated domain -- unlike the old
// per-domain setup, sitemap.xml has no region segment of its own to resolve
// a "current" region from, so it lists every active region's pages under
// its own /{slug}/... prefix instead of just one.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activeRegions = await db.select().from(regions).where(eq(regions.active, true));

  const lastVerifiedRows = await db
    .select({ venueId: specials.venueId, lastVerifiedAt: max(specials.lastVerifiedAt) })
    .from(specials)
    .where(isNull(specials.archivedAt))
    .groupBy(specials.venueId);
  const lastVerifiedByVenue = new Map(
    lastVerifiedRows.map((r) => [r.venueId, r.lastVerifiedAt ? new Date(r.lastVerifiedAt) : new Date()])
  );

  const entries: MetadataRoute.Sitemap = [];

  for (const region of activeRegions) {
    const BASE_URL = `${SITE_URL}/${region.slug}`;

    const activeVenues = await db
      .select({ id: venues.id })
      .from(venues)
      .where(and(eq(venues.active, true), eq(venues.regionId, region.id)));

    entries.push(
      { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
      { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
      { url: `${BASE_URL}/monthly`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
      { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
      { url: `${BASE_URL}/submit`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
      { url: `${BASE_URL}/advertise`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
      { url: `${BASE_URL}/archive`, lastModified: new Date(), changeFrequency: "daily", priority: 0.4 },
      { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 }
    );

    for (const v of activeVenues) {
      entries.push({
        url: `${BASE_URL}/venues/${v.id}`,
        lastModified: lastVerifiedByVenue.get(v.id) ?? new Date(),
        changeFrequency: "daily",
        priority: 0.6,
      });
    }

    for (const p of BLOG_POSTS) {
      entries.push({
        url: `${BASE_URL}/blog/${p.slug}`,
        lastModified: new Date(p.publishedAt),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return [{ url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 }, ...entries];
}
