import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The privacy page keeps its copy inline, so this reads the English block and checks it
// says what the site really records (taps and impressions, browser type, how long it is
// kept, where the visitor id lives, and that owners see counts for their own listing).
const source = readFileSync(join(__dirname, "..", "app", "[region]", "privacy", "page.tsx"), "utf8");
const en = source.slice(source.indexOf("  en: {"), source.indexOf("  fr: {"));

describe("English privacy copy: analytics", () => {
  const analytics = en.slice(en.indexOf("analyticsBody:"), en.indexOf("submissionsHeading:"));

  it("covers interactions and on-screen listings, not just page views", () => {
    expect(analytics).toMatch(/tapping/i);
    expect(analytics).toMatch(/shown on screen/i);
  });

  it("discloses the browser type", () => {
    expect(analytics).toMatch(/browser type/i);
  });

  it("states how long it is kept, matching RETENTION_DAYS", () => {
    const lib = readFileSync(join(__dirname, "analytics.ts"), "utf8");
    const days = lib.match(/RETENTION_DAYS = (\d+)/)![1];
    expect(analytics).toContain(`${days} days`);
  });

  it("says venue owners see combined counts for their own listing", () => {
    expect(analytics).toMatch(/venue owner/i);
    expect(analytics).toMatch(/own listing/i);
  });
});

describe("English privacy copy: storage", () => {
  const cookies = en.slice(en.indexOf("cookiesBody:"), en.indexOf("sponsoredHeading:"));

  it("says the ids live in local storage, and the only cookie is for excluding our own visits", () => {
    expect(cookies).toMatch(/local storage/i);
    expect(cookies).toMatch(/our own team/i);
    expect(cookies).not.toMatch(/opt out/i);
    expect(cookies).not.toMatch(/A cookie stores your session\/visitor ID/);
  });
});
