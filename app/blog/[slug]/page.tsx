import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-data";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post not found" };
  const url = `https://kelownafooddeals.shop/blog/${post.slug}`;
  return {
    title: `${post.title} — Kelowna Daily Specials`,
    description: post.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url,
      type: "article",
      publishedTime: post.publishedAt,
    },
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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    image: "https://kelownafooddeals.shop/icons/icon-512.png",
    author: { "@type": "Organization", name: "Kelowna Daily Specials" },
    publisher: { "@type": "Organization", name: "Kelowna Daily Specials" },
    mainEntityOfPage: `https://kelownafooddeals.shop/blog/${post.slug}`,
  };

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader
        active="blog"
        subtitle="Guides to what's actually going on around town."
        brandIsHeading={false}
      />

      <div>
        <Link href="/blog" className="text-sm text-accent-dim hover:underline">
          ← All posts
        </Link>
      </div>

      <article className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <span className="text-xs text-muted-2 font-mono-tabular">
            {formatDate(post.publishedAt)}
          </span>
          <h1 className="font-display text-3xl text-foreground">{post.title}</h1>
        </header>
        <div
          className="prose-blog flex flex-col gap-4 text-sm text-foreground/90 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-foreground [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_a]:text-accent-dim [&_a]:underline [&_strong]:text-foreground"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>

      <SiteFooter />
    </div>
  );
}
