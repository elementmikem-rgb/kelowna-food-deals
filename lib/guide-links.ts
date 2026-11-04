import { getBlogPostsForRegion } from "./blog-data";

export interface GuideLink {
  href: string;
  title: string;
}

export type GuideContext =
  | { kind: "home" | "day" | "venue" }
  | { kind: "category"; slug: string }
  | { kind: "town"; slug: string };

// Kelowna has several topical guides beside its happy hour guide. A topical guide is linked from the
// category or town page it is about, and every Kelowna guide is linked from its home page.
const KELOWNA_BY_CATEGORY: Record<string, string> = {
  "wing-night": "best-wing-nights-kelowna",
  "food-specials": "cheap-eats-kelowna-under-10",
};
const KELOWNA_BY_TOWN: Record<string, string> = {
  "west-kelowna": "kelowna-west-kelowna-peachland-deals",
  peachland: "kelowna-west-kelowna-peachland-deals",
};

// The crawlable links from a page to its region's guides. The guides were only reachable through the
// footer's blog index, so no content page pointed at them; this gives each region's home, day,
// category, town and venue pages a real link to the guide for that region.
export function getGuideLinks(regionSlug: string, ctx: GuideContext): GuideLink[] {
  // Only posts written for this region: the region-agnostic explainer has no `regions` and is skipped.
  const posts = getBlogPostsForRegion(regionSlug).filter((p) => p.regions?.includes(regionSlug) && !p.sponsored);
  const toLink = (slug: string): GuideLink | null => {
    const p = posts.find((x) => x.slug === slug);
    return p ? { href: `/${regionSlug}/blog/${p.slug}`, title: p.title } : null;
  };
  const primary = posts.find((p) => p.slug.startsWith("happy-hours-"));
  if (!primary) return [];
  const links: GuideLink[] = [toLink(primary.slug)!];

  if (ctx.kind === "home") {
    for (const p of posts) if (p.slug !== primary.slug) links.push(toLink(p.slug)!);
    return links;
  }
  if (regionSlug !== "kelowna") return links;

  const extra = ctx.kind === "category" ? KELOWNA_BY_CATEGORY[ctx.slug] : ctx.kind === "town" ? KELOWNA_BY_TOWN[ctx.slug] : undefined;
  const link = extra ? toLink(extra) : null;
  if (link) links.push(link);
  return links;
}

// The "how we verify" explainer is the closest thing the site has to an About page. It is English
// only, so French regions get no link rather than a jump into another language.
export function getVerifyLink(regionSlug: string, lang: string): GuideLink | null {
  if (lang === "fr") return null;
  return { href: `/${regionSlug}/blog/how-we-verify-every-special`, title: "How we verify every special" };
}
