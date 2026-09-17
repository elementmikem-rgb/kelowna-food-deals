import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_POSTS } from "@/lib/blog-data";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentRegion, getRegionBySlug } from "@/lib/regions";
import type { Language } from "@/lib/i18n";
import { getEffectiveLanguage } from "@/lib/i18n";

const content = {
  en: {
    metaDesc:
      "Guides to Kelowna food and drink specials, happy hours, and wing nights — grounded in what we've actually verified, not generic filler.",
    subtitle: "Guides to what's actually going on around town.",
    sponsored: "Sponsored",
    readMore: "Read more →",
  },
  fr: {
    metaDesc:
      "Guides sur les spéciaux repas et boissons, les heures d'apéro et les soirées thématiques — vérifiés sur place, pas du contenu générique.",
    subtitle: "Guides sur ce qui se passe vraiment en ville.",
    sponsored: "Commandité",
    readMore: "Lire la suite →",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region: slug } = await params;
  const region = await getRegionBySlug(slug);
  if (!region) return {};
  const lang = region.language as Language;
  return {
    title: "Blog",
    description: content[lang].metaDesc,
    alternates: { canonical: `/${region.slug}/blog` },
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
  const lang = await getEffectiveLanguage(region);
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader active="blog" subtitle={content[lang].subtitle} />

      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <article key={post.slug} className="flex flex-col gap-1 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-evergreen">
                {post.category}
              </span>
              {post.sponsored && (
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                  {content[lang].sponsored}
                </span>
              )}
              <span className="text-xs text-muted-2 font-mono-tabular">
                {formatDate(post.publishedAt)}
              </span>
            </div>
            <h2 className="font-display text-2xl text-foreground">
              <Link href={`/${region.slug}/blog/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            <p className="text-sm text-muted">{post.excerpt}</p>
            <Link
              href={`/${region.slug}/blog/${post.slug}`}
              className="text-sm text-accent-dim underline self-start mt-1"
            >
              {content[lang].readMore}
            </Link>
          </article>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
