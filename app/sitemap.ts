import type { MetadataRoute } from "next";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";

const BASE_URL = "https://kelownafooddeals.shop";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activeVenues = await db
    .select({ id: venues.id })
    .from(venues)
    .where(eq(venues.active, true));

  const venuePages: MetadataRoute.Sitemap = activeVenues.map((v) => ({
    url: `${BASE_URL}/venues/${v.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.6,
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
      url: `${BASE_URL}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...venuePages,
  ];
}
