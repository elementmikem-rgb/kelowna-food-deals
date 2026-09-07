import type { MetadataRoute } from "next";
import { getCurrentRegion } from "@/lib/regions";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const region = await getCurrentRegion();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${region.domain}/sitemap.xml`,
  };
}
