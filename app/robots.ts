import type { MetadataRoute } from "next";
import { getPrimaryRegion } from "@/lib/regions";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const region = await getPrimaryRegion();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${region.domain}/sitemap.xml`,
  };
}
