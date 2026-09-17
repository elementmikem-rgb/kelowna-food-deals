import { describe, expect, it } from "vitest";
import { VENUE_DETAIL_PAGE_RE } from "./analytics";

// VENUE_DETAIL_PAGE_RE is a Postgres regex string (used with the `~` operator), but its
// syntax is plain enough to double as a JS RegExp source for this pure logic test --
// no DB needed to verify the pattern isolates a venue's own detail page correctly.
const re = new RegExp(VENUE_DETAIL_PAGE_RE);

describe("VENUE_DETAIL_PAGE_RE", () => {
  it("matches a bare venue detail page", () => {
    expect(re.test("/kelowna/venues/123")).toBe(true);
  });

  it("does not match the venue's own claim sub-page", () => {
    expect(re.test("/kelowna/venues/123/claim")).toBe(false);
  });

  it("matches a different venue's own detail page too (id extraction, not this regex, is what keeps counts per-venue exact)", () => {
    expect(re.test("/kelowna/venues/1234")).toBe(true);
  });

  it("does not match the region homepage or other non-venue pages", () => {
    expect(re.test("/kelowna")).toBe(false);
    expect(re.test("/kelowna/advertise")).toBe(false);
  });
});
