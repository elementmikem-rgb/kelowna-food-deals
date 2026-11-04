import { describe, it, expect } from "vitest";
import { buildBlogFeed } from "./blog-feed";
import type { BlogPost } from "./blog-data";

function post(over: Partial<BlogPost>): BlogPost {
  return {
    slug: "a",
    title: "Title A",
    metaDescription: "Meta A",
    publishedAt: "2026-10-01",
    excerpt: "Excerpt A",
    contentHtml: "<p>x</p>",
    category: "Guide",
    regions: ["penticton"],
    ...over,
  };
}

const SITE = "https://todaystab.com";

describe("buildBlogFeed", () => {
  it("is an RSS 2.0 channel for the region's blog with a self link", () => {
    const xml = buildBlogFeed({ siteUrl: SITE, regionSlug: "penticton", brandName: "Penticton Food Deals", posts: [post({})] });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(xml).toContain("<title>Penticton Food Deals</title>");
    expect(xml).toContain(`<link>${SITE}/penticton/blog</link>`);
    expect(xml).toContain(`<atom:link href="${SITE}/penticton/blog/feed.xml" rel="self" type="application/rss+xml"/>`);
  });

  it("lists posts newest first with link, guid and RFC 822 date", () => {
    const xml = buildBlogFeed({
      siteUrl: SITE,
      regionSlug: "penticton",
      brandName: "Penticton Food Deals",
      posts: [post({ slug: "old", title: "Old", publishedAt: "2026-09-01" }), post({ slug: "new", title: "New", publishedAt: "2026-10-31" })],
    });
    expect(xml.indexOf("<title>New</title>")).toBeLessThan(xml.indexOf("<title>Old</title>"));
    expect(xml).toContain(`<link>${SITE}/penticton/blog/new</link>`);
    expect(xml).toContain(`<guid isPermaLink="true">${SITE}/penticton/blog/new</guid>`);
    expect(xml).toContain("<pubDate>Sat, 31 Oct 2026 00:00:00 GMT</pubDate>");
  });

  it("uses the last update as the date when the post was refreshed", () => {
    const xml = buildBlogFeed({
      siteUrl: SITE,
      regionSlug: "penticton",
      brandName: "B",
      posts: [post({ publishedAt: "2026-10-01", updatedAt: "2026-10-31" })],
    });
    expect(xml).toContain("<pubDate>Sat, 31 Oct 2026 00:00:00 GMT</pubDate>");
  });

  it("escapes markup characters in titles and descriptions", () => {
    const xml = buildBlogFeed({
      siteUrl: SITE,
      regionSlug: "penticton",
      brandName: "Fish & Chips <Deals>",
      posts: [post({ title: "Wings & \"Beer\" <3", excerpt: "5 < 6 & more" })],
    });
    expect(xml).toContain("<title>Fish &amp; Chips &lt;Deals&gt;</title>");
    expect(xml).toContain("<title>Wings &amp; &quot;Beer&quot; &lt;3</title>");
    expect(xml).toContain("<description>5 &lt; 6 &amp; more</description>");
    expect(xml).not.toContain("& Chips");
  });
});
