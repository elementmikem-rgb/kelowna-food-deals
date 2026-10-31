import type { BlogPost } from "./blog-data";

// Structured data for blog posts, derived from the post's own HTML so there is one source of
// truth: the FAQ a reader sees (H3 questions) is exactly the FAQPage markup, and the venues a
// reader can click (links to /<region>/venues/<id>) are exactly the ItemList. Nothing is
// maintained twice, so the markup can never drift from the visible text.

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
};

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39|#x27);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

export interface FaqItem {
  q: string;
  a: string;
}

// An FAQ entry is an <h3> ending in "?" followed directly by a <p>. Other H3s are ignored.
export function extractFaq(html: string): FaqItem[] {
  const items: FaqItem[] = [];
  for (const m of html.matchAll(/<h3>([^<]*\?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)) {
    items.push({ q: plainText(m[1]), a: plainText(m[2]) });
  }
  return items;
}

export interface VenueItem {
  position: number;
  name: string;
  url: string;
}

// Every distinct link to a venue page, in the order the reader meets them. The street address
// in the link text ("Venue (123 Main St)") is dropped so the name is just the venue.
export function extractVenueItems(html: string, siteUrl: string): VenueItem[] {
  const seen = new Set<string>();
  const items: VenueItem[] = [];
  for (const m of html.matchAll(/<a href="\/([a-z0-9-]+)\/venues\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const key = `${m[1]}/${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = plainText(m[3]).replace(/\s*\([^)]*\)\s*$/, "");
    items.push({ position: items.length + 1, name, url: `${siteUrl}/${m[1]}/venues/${m[2]}` });
  }
  return items;
}

export function buildBlogJsonLd(
  post: BlogPost,
  region: { slug: string; brandName: string },
  siteUrl: string
): Record<string, unknown> {
  const org = { "@type": "Organization", name: region.brandName, url: `${siteUrl}/${region.slug}` };
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "BlogPosting",
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      image: `${siteUrl}/icons/icon-512.png`,
      author: org,
      publisher: org,
      mainEntityOfPage: `${siteUrl}/${region.slug}/blog/${post.slug}`,
    },
  ];

  const faq = extractFaq(post.contentHtml);
  if (faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const venues = extractVenueItems(post.contentHtml, siteUrl);
  if (venues.length > 0) {
    graph.push({
      "@type": "ItemList",
      itemListElement: venues.map((v) => ({ "@type": "ListItem", position: v.position, name: v.name, url: v.url })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

// One markdown list line per region-scoped post, for llms.txt. Unscoped (region-agnostic)
// posts are skipped: they have no single canonical URL to point an AI crawler at.
export function buildLlmsGuideLines(posts: readonly BlogPost[], siteUrl: string): string {
  const lines: string[] = [];
  for (const p of posts) {
    for (const region of p.regions ?? []) {
      lines.push(`- [${p.title}](${siteUrl}/${region}/blog/${p.slug}): ${p.excerpt}`);
    }
  }
  return lines.join("\n");
}
