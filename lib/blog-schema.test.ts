import { describe, it, expect } from "vitest";
import {
  extractFaq,
  extractVenueItems,
  buildBlogJsonLd,
  buildLlmsGuideLines,
} from "./blog-schema";
import { blogLastModified, type BlogPost } from "./blog-data";

const SITE = "https://todaystab.com";

const HTML = `
<p>Quick answer: most Penticton happy hours run 3 to 5&nbsp;PM.</p>
<h2>Downtown</h2>
<p><strong><a href="/penticton/venues/359">Highway 97 Brewery (200 Ellis St)</a></strong> $5 sleeves.</p>
<p><strong><a href="/penticton/venues/360">Kin &amp; Folk (557 Main St)</a></strong> Cocktails.</p>
<p>Again: <a href="/penticton/venues/359">Highway 97 Brewery</a> and <a href="/penticton">the page</a>.</p>
<h2>FAQ</h2>
<h3>What time is happy hour in Penticton?</h3>
<p>Most run <strong>3 to 5&nbsp;PM</strong> on weekdays &amp; some run late.</p>
<h3>Not a question</h3>
<p>Ignored.</p>
<h3>Is there a Sunday happy hour?</h3>
<p>Yes, at Barley Mill.</p>
`;

describe("extractFaq", () => {
  it("returns only H3 questions (ending in ?) with their following paragraph as plain text", () => {
    expect(extractFaq(HTML)).toEqual([
      { q: "What time is happy hour in Penticton?", a: "Most run 3 to 5 PM on weekdays & some run late." },
      { q: "Is there a Sunday happy hour?", a: "Yes, at Barley Mill." },
    ]);
  });

  it("returns an empty list when there is no FAQ", () => {
    expect(extractFaq("<p>No questions here.</p>")).toEqual([]);
  });
});

describe("extractVenueItems", () => {
  it("lists each venue page once, in first-seen order, with the address stripped from the name", () => {
    expect(extractVenueItems(HTML, SITE)).toEqual([
      { position: 1, name: "Highway 97 Brewery", url: `${SITE}/penticton/venues/359` },
      { position: 2, name: "Kin & Folk", url: `${SITE}/penticton/venues/360` },
    ]);
  });

  it("decodes accented-letter entities in venue names (named and numeric), not just &amp; and &nbsp;", () => {
    const html = `<p><a href="/hamilton/venues/7">D&eacute;j&agrave; Vu Bar (1 Main St)</a></p><p><a href="/hamilton/venues/8">Bard&#333; Locke St (333 Locke St S)</a></p><p><a href="/hamilton/venues/9">Caf&#xE9; Oz (2 King St)</a></p>`;
    expect(extractVenueItems(html, SITE).map((v) => v.name)).toEqual(["Déjà Vu Bar", "Bardō Locke St", "Café Oz"]);
  });

  it("ignores non-venue links", () => {
    expect(extractVenueItems(`<a href="/penticton">x</a>`, SITE)).toEqual([]);
  });
});

const POST: BlogPost = {
  slug: "happy-hours-penticton-2026",
  title: "Penticton Happy Hours 2026",
  metaDescription: "desc",
  publishedAt: "2026-10-29",
  excerpt: "e",
  contentHtml: HTML,
  category: "Guide",
  regions: ["penticton"],
};

describe("buildBlogJsonLd", () => {
  const ld = buildBlogJsonLd(POST, { slug: "penticton", brandName: "Penticton Food Deals" }, SITE);
  const graph = ld["@graph"] as Array<Record<string, unknown>>;
  const posting = graph.find((n) => n["@type"] === "BlogPosting")!;

  it("is a single @graph with BlogPosting, FAQPage and ItemList", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(graph.map((n) => n["@type"]).sort()).toEqual(["BlogPosting", "FAQPage", "ItemList"]);
  });

  it("uses publishedAt as dateModified when the post has not been updated", () => {
    expect(posting.datePublished).toBe("2026-10-29");
    expect(posting.dateModified).toBe("2026-10-29");
  });

  it("uses updatedAt as dateModified after a refresh", () => {
    const g = buildBlogJsonLd({ ...POST, updatedAt: "2026-10-31" }, { slug: "penticton", brandName: "B" }, SITE)["@graph"] as Array<Record<string, unknown>>;
    expect(g.find((n) => n["@type"] === "BlogPosting")!.dateModified).toBe("2026-10-31");
  });

  it("names the organisation author with a url and links the canonical page", () => {
    expect(posting.author).toEqual({ "@type": "Organization", name: "Penticton Food Deals", url: `${SITE}/penticton` });
    expect(posting.mainEntityOfPage).toBe(`${SITE}/penticton/blog/happy-hours-penticton-2026`);
  });

  it("omits FAQPage and ItemList when the post has none", () => {
    const g = buildBlogJsonLd({ ...POST, contentHtml: "<p>plain</p>" }, { slug: "penticton", brandName: "B" }, SITE)["@graph"] as Array<Record<string, unknown>>;
    expect(g.map((n) => n["@type"])).toEqual(["BlogPosting"]);
  });
});

describe("blogLastModified", () => {
  it("prefers updatedAt, falls back to publishedAt", () => {
    expect(blogLastModified({ ...POST, updatedAt: "2026-11-30" }).toISOString().slice(0, 10)).toBe("2026-11-30");
    expect(blogLastModified(POST).toISOString().slice(0, 10)).toBe("2026-10-29");
  });
});

describe("buildLlmsGuideLines", () => {
  it("lists region-scoped guides with absolute URLs and the excerpt, skipping unscoped posts", () => {
    const lines = buildLlmsGuideLines(
      [POST, { ...POST, slug: "how-we-verify", regions: undefined, title: "Agnostic" }],
      SITE
    );
    expect(lines).toBe(`- [Penticton Happy Hours 2026](${SITE}/penticton/blog/happy-hours-penticton-2026): e`);
  });
});
