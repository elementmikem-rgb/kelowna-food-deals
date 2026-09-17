import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBlogPost } from "@/lib/blog-data";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentRegion } from "@/lib/regions";
import type { Language } from "@/lib/i18n";
import { getEffectiveLanguage } from "@/lib/i18n";

const content = {
  en: {
    subtitle: "Guides to what's actually going on around town.",
    backLink: "← All posts",
    sponsored: "Sponsored",
    sponsoredPre: "This post is a paid feature. See our",
    sponsoredLinkText: "privacy & terms",
    sponsoredPost: "page for how sponsored content works here.",
  },
  fr: {
    subtitle: "Guides sur ce qui se passe vraiment en ville.",
    backLink: "← Tous les articles",
    sponsored: "Commandité",
    sponsoredPre: "Cet article est un contenu commandité. Consultez notre page",
    sponsoredLinkText: "confidentialité et conditions",
    sponsoredPost: "pour en savoir plus sur le fonctionnement des contenus commandités.",
  },
} as const;

// This route has two dynamic segments ([region] and [slug]); the page body
// also reads headers()/cookies() (via getCurrentRegion/getEffectiveLanguage)
// for per-region, per-visitor rendering, which Next disallows during static
// generation. generateStaticParams below only ever enumerated slug (never
// region), so with dynamicParams left at its default it produced a
// DYNAMIC_SERVER_USAGE 500 on every request; with dynamicParams = false it
// 404'd everything instead, since no request could ever match. force-dynamic
// (the same fix used by app/[region]/archive/page.tsx) is the correct
// answer: render this page live per request, same as the region it belongs
// to already requires.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post not found" };
  const region = await getCurrentRegion();
  const url = `/${region.slug}/blog/${post.slug}`;
  return {
    title: post.title,
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
  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    image: `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/icons/icon-512.png`,
    author: { "@type": "Organization", name: region.brandName },
    publisher: { "@type": "Organization", name: region.brandName },
    mainEntityOfPage: `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${region.slug}/blog/${post.slug}`,
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
        subtitle={content[lang].subtitle}
        brandIsHeading={false}
      />

      <div>
        <Link href={`/${region.slug}/blog`} className="text-sm text-accent-dim hover:underline">
          {content[lang].backLink}
        </Link>
      </div>

      <article className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-2 font-mono-tabular">
              {formatDate(post.publishedAt)}
            </span>
            {post.sponsored && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                {content[lang].sponsored}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl text-foreground">{post.title}</h1>
          {post.sponsored && (
            <p className="text-xs text-muted-2">
              {content[lang].sponsoredPre}{" "}
              <Link href={`/${region.slug}/privacy`} className="text-accent-dim underline">
                {content[lang].sponsoredLinkText}
              </Link>{" "}
              {content[lang].sponsoredPost}
            </p>
          )}
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
