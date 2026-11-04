import { getBlogPostsForRegion } from "@/lib/blog-data";
import { buildBlogFeed } from "@/lib/blog-feed";
import { getRegionBySlug } from "@/lib/regions";
import { SITE_URL } from "@/lib/seo";

// RSS feed of a region's guides: /kelowna/blog/feed.xml. Only posts written for this region go in,
// not the region-agnostic explainer, and a region with no guides has no feed.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ region: string }> }) {
  const { region: slug } = await params;
  const region = await getRegionBySlug(slug);
  if (!region) return new Response("Not found", { status: 404 });
  const posts = getBlogPostsForRegion(region.slug).filter((p) => p.regions?.includes(region.slug));
  if (posts.length === 0) return new Response("Not found", { status: 404 });
  const xml = buildBlogFeed({ siteUrl: SITE_URL, regionSlug: region.slug, brandName: region.brandName, posts });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
