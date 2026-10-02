import { describe, it, expect } from "vitest";
import { getBlogPost, getBlogPostsForRegion } from "./blog-data";

describe("getBlogPost", () => {
  it("returns a region-scoped post under its own region", () => {
    expect(getBlogPost("best-wing-nights-kelowna", "kelowna")).toBeDefined();
  });

  it("returns undefined for a region-scoped post under a different region", () => {
    // Regression test for the duplicate-content bug fixed 2026-10-02: every blog
    // post used to render under every region's /[region]/blog/[slug] URL, so
    // Kelowna-specific content (real Kelowna venue names) was reachable, sitemap
    // listed, and declared canonical at ~97 different region URLs at once.
    expect(getBlogPost("best-wing-nights-kelowna", "red-deer")).toBeUndefined();
  });

  it("returns a region-agnostic post (no `regions` field) under any region", () => {
    expect(getBlogPost("how-we-verify-every-special", "red-deer")).toBeDefined();
    expect(getBlogPost("how-we-verify-every-special", "kelowna")).toBeDefined();
  });

  it("returns undefined for an unknown slug", () => {
    expect(getBlogPost("does-not-exist", "kelowna")).toBeUndefined();
  });
});

describe("getBlogPostsForRegion", () => {
  it("excludes region-scoped posts from an unrelated region's listing", () => {
    const posts = getBlogPostsForRegion("red-deer");
    expect(posts.some((p) => p.slug === "best-wing-nights-kelowna")).toBe(false);
  });

  it("includes region-scoped posts in their own region's listing", () => {
    const posts = getBlogPostsForRegion("kelowna");
    expect(posts.some((p) => p.slug === "best-wing-nights-kelowna")).toBe(true);
  });

  it("includes region-agnostic posts in every region's listing", () => {
    expect(getBlogPostsForRegion("red-deer").some((p) => p.slug === "how-we-verify-every-special")).toBe(true);
    expect(getBlogPostsForRegion("kelowna").some((p) => p.slug === "how-we-verify-every-special")).toBe(true);
  });
});
