import type { BlogPost } from "./blog-data";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// "2026-10-31" -> "Sat, 31 Oct 2026 00:00:00 GMT" (RFC 822, what RSS readers expect).
function rfc822(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toUTCString();
}

// RSS 2.0 feed of a region's guides, newest first. A refreshed post is dated by its last update so a
// reader or AI tool sees the refresh as a change.
export function buildBlogFeed(opts: { siteUrl: string; regionSlug: string; brandName: string; posts: BlogPost[] }): string {
  const { siteUrl, regionSlug, brandName } = opts;
  const blogUrl = `${siteUrl}/${regionSlug}/blog`;
  const dateOf = (p: BlogPost) => p.updatedAt ?? p.publishedAt;
  const posts = [...opts.posts].sort((a, b) => (dateOf(a) < dateOf(b) ? 1 : -1));
  const items = posts
    .map((p) => {
      const url = `${blogUrl}/${p.slug}`;
      return [
        "    <item>",
        `      <title>${esc(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${rfc822(dateOf(p))}</pubDate>`,
        `      <description>${esc(p.excerpt)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${esc(brandName)}</title>`,
    `    <link>${blogUrl}</link>`,
    `    <description>${esc(`Guides to food and drink specials from ${brandName}`)}</description>`,
    `    <atom:link href="${blogUrl}/feed.xml" rel="self" type="application/rss+xml"/>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
