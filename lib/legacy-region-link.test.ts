import { describe, it, expect } from "vitest";
import { decideVenueRegionRouting, emailedLinkRegex } from "./legacy-region-link";

describe("decideVenueRegionRouting", () => {
  it("shows the page when the venue belongs to the requested region", () => {
    expect(decideVenueRegionRouting({ venueRegionId: 30, requestRegionId: 30, wasEmailedThisLink: false })).toBe("show");
  });

  it("redirects when the venue moved regions and we emailed that exact old link", () => {
    // Regression: Hansen Distillery (venue 3351) was emailed /calgary-nw/venues/3351, then moved
    // to st-albert-spruce-grove -- the emailed link 404'd.
    expect(decideVenueRegionRouting({ venueRegionId: 30, requestRegionId: 12, wasEmailedThisLink: true })).toBe("redirect");
  });

  it("still 404s a venue under the wrong region when we never emailed that link", () => {
    expect(decideVenueRegionRouting({ venueRegionId: 30, requestRegionId: 12, wasEmailedThisLink: false })).toBe("notFound");
  });
});

describe("emailedLinkRegex", () => {
  const re = (slug: string, id: number) => new RegExp(emailedLinkRegex(slug, id));

  it("matches the venue link inside an email body", () => {
    expect(re("calgary-nw", 3351).test('<a href="https://todaystab.com/calgary-nw/venues/3351">x</a>')).toBe(true);
    expect(re("calgary-nw", 3351).test("page: https://todaystab.com/calgary-nw/venues/3351")).toBe(true);
    expect(re("calgary-nw", 3351).test("https://todaystab.com/calgary-nw/venues/3351")).toBe(true);
  });

  it("does not match a longer venue id that merely starts with the same digits", () => {
    expect(re("calgary-nw", 3351).test("https://todaystab.com/calgary-nw/venues/33510")).toBe(false);
  });

  it("does not match a different region slug or a different venue", () => {
    expect(re("calgary-nw", 3351).test("https://todaystab.com/calgary-sw/venues/3351")).toBe(false);
    expect(re("calgary-nw", 3351).test("https://todaystab.com/calgary-nw/venues/3352")).toBe(false);
  });

  it("refuses a slug that is not plain lowercase letters, digits and hyphens", () => {
    expect(() => emailedLinkRegex("calgary.*", 3351)).toThrow();
    expect(() => emailedLinkRegex("a/b", 3351)).toThrow();
  });
});
