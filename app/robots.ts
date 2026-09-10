import type { MetadataRoute } from "next";

const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
