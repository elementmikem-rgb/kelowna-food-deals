import { describe, it, expect } from "vitest";
import { getGuideLinks, getVerifyLink } from "./guide-links";

describe("getGuideLinks", () => {
  it("links a region's happy hour guide from a day page and a venue page", () => {
    const day = getGuideLinks("penticton", { kind: "day" });
    expect(day.map((l) => l.href)).toEqual(["/penticton/blog/happy-hours-penticton-2026"]);
    const venue = getGuideLinks("penticton", { kind: "venue" });
    expect(venue.map((l) => l.href)).toEqual(["/penticton/blog/happy-hours-penticton-2026"]);
  });

  it("returns nothing for a region without a guide", () => {
    expect(getGuideLinks("prince-george", { kind: "home" })).toEqual([]);
    expect(getGuideLinks("prince-george", { kind: "day" })).toEqual([]);
  });

  it("never links the region-agnostic explainer or another region's guide", () => {
    const hrefs = getGuideLinks("kelowna", { kind: "home" }).map((l) => l.href);
    expect(hrefs.some((h) => h.includes("how-we-verify-every-special"))).toBe(false);
    expect(hrefs.some((h) => h.includes("penticton"))).toBe(false);
  });

  it("lists all of Kelowna's guides on its home page, happy hour 2026 first", () => {
    const hrefs = getGuideLinks("kelowna", { kind: "home" }).map((l) => l.href);
    expect(hrefs[0]).toBe("/kelowna/blog/happy-hours-kelowna-2026");
    expect(hrefs).toContain("/kelowna/blog/best-wing-nights-kelowna");
    expect(hrefs).toContain("/kelowna/blog/cheap-eats-kelowna-under-10");
    expect(hrefs).toContain("/kelowna/blog/trivia-karaoke-nights-kelowna");
    expect(hrefs).toContain("/kelowna/blog/kelowna-west-kelowna-peachland-deals");
  });

  it("adds the matching Kelowna guide on a category or town page", () => {
    const wing = getGuideLinks("kelowna", { kind: "category", slug: "wing-night" }).map((l) => l.href);
    expect(wing).toEqual(["/kelowna/blog/happy-hours-kelowna-2026", "/kelowna/blog/best-wing-nights-kelowna"]);
    const food = getGuideLinks("kelowna", { kind: "category", slug: "food-specials" }).map((l) => l.href);
    expect(food).toContain("/kelowna/blog/cheap-eats-kelowna-under-10");
    const town = getGuideLinks("kelowna", { kind: "town", slug: "west-kelowna" }).map((l) => l.href);
    expect(town).toContain("/kelowna/blog/kelowna-west-kelowna-peachland-deals");
    const other = getGuideLinks("kelowna", { kind: "town", slug: "lake-country" }).map((l) => l.href);
    expect(other).toEqual(["/kelowna/blog/happy-hours-kelowna-2026"]);
  });

  it("gives each link the post title and its language", () => {
    const [link] = getGuideLinks("quebec-city", { kind: "day" });
    expect(link.href).toBe("/quebec-city/blog/happy-hours-quebec");
    expect(link.title.length).toBeGreaterThan(10);
  });
});

describe("getVerifyLink", () => {
  it("links the how-we-verify post for an English region", () => {
    expect(getVerifyLink("kelowna", "en")).toEqual({
      href: "/kelowna/blog/how-we-verify-every-special",
      title: "How we verify every special",
    });
  });

  it("returns nothing for a French region, since the post is English only", () => {
    expect(getVerifyLink("quebec-city", "fr")).toBeNull();
  });
});
