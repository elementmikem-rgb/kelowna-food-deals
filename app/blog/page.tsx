import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_POSTS } from "@/lib/blog-data";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides to Kelowna food and drink specials, happy hours, and wing nights — grounded in what we've actually verified, not generic filler.",
  alternates: { canonical: "https://kelownafooddeals.shop/blog" },
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader active="blog" subtitle="Guides to what's actually going on around town." />

      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <article key={post.slug} className="flex flex-col gap-1 pb-6 border-b border-border">
            <span className="text-xs text-muted-2 font-mono-tabular">
              {formatDate(post.publishedAt)}
            </span>
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
