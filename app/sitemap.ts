import type { MetadataRoute } from "next";
import { db, venues, specials } from "@/db";
import { and, eq, isNull, max } from "drizzle-orm";
import { getPrimaryRegion } from "@/lib/regions";
import { BLOG_POSTS } from "@/lib/blog-data";

// Without this, Next prerenders the sitemap once at build time and it never
// regenerates -- venues added by the nightly cron wouldn't appear until the
// next deploy, and lastModified would freeze to the build timestamp forever.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const region = await getPrimaryRegion();
  const BASE_URL = `https://${region.domain}`;

  const activeVenues = await db
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.regionId, region.id)));

  // venues has no updatedAt column, so derive a real per-venue lastModified
  // from its most recently verified special rather than always "now".
  const lastVerifiedRows = await db
    .select({ venueId: specials.venueId, lastVerifiedAt: max(specials.lastVerifiedAt) })
    .from(specials)
    .where(isNull(specials.archivedAt))
    .groupBy(specials.venueId);
  const lastVerifiedByVenue = new Map(
    lastVerifiedRows.map((r) => [r.venueId, r.lastVerifiedAt ? new Date(r.lastVerifiedAt) : new Date()])
  );

  const venuePages: MetadataRoute.Sitemap = activeVenues.map((v) => ({
    url: `${BASE_URL}/venues/${v.id}`,
    lastModified: lastVerifiedByVenue.get(v.id) ?? new Date(),
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/advertise`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/archive`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...venuePages,
    ...blogPages,
  ];
}
