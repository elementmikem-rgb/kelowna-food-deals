import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPostsForRegion } from "@/lib/blog-data";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentRegion } from "@/lib/regions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  return {
    title: "Blog",
    description: `Guides to ${region.brandName} listings — food and drink specials, happy hours, and wing nights, grounded in what we've actually verified, not generic filler.`,
    // Canonical follows the serving domain. Hardcoding one region's URL told search
    // engines every other region's blog was a duplicate of it.
    alternates: { canonical: `https://${region.domain}/blog` },
  };
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogIndexPage() {
  const region = await getCurrentRegion();
  const posts = getBlogPostsForRegion(region.slug).sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1
  );

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader active="blog" subtitle="Guides to what's actually going on around town." />

      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <article key={post.slug} className="flex flex-col gap-1 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-evergreen">
                {post.category}
              </span>
              {post.sponsored && (
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                  Sponsored
                </span>
              )}
              <span className="text-xs text-muted-2 font-mono-tabular">
                {formatDate(post.publishedAt)}
              </span>
            </div>
            <h2 className="font-display text-2xl text-foreground">
              <Link href={`/blog/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            <p className="text-sm text-muted">{post.excerpt}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="text-sm text-accent-dim underline self-start mt-1"
            >
              Read more →
            </Link>
          </article>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
