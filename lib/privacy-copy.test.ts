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

  it("does not over-promise anonymity: a random visitor ID can still be personal information", () => {
    expect(analytics).not.toMatch(/tied to you personally/i);
    expect(analytics).toMatch(/not used to identify you/i);
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

describe("French privacy copy", () => {
  const fr = source.slice(source.indexOf("  fr: {"));
  const analytics = fr.slice(fr.indexOf("analyticsBody:"), fr.indexOf("submissionsHeading:"));
  const cookies = fr.slice(fr.indexOf("cookiesBody:"), fr.indexOf("sponsoredHeading:"));

  it("covers interactions and on-screen listings", () => {
    expect(analytics).toMatch(/appuyer/i);
    expect(analytics).toMatch(/affichées à l'écran/i);
  });

  it("discloses the browser type and the retention period", () => {
    expect(analytics).toMatch(/type de navigateur/i);
    const lib = readFileSync(join(__dirname, "analytics.ts"), "utf8");
    expect(analytics).toContain(`${lib.match(/RETENTION_DAYS = (\d+)/)![1]} jours`);
  });

  it("says venue owners see combined counts for their own listing", () => {
    expect(analytics).toMatch(/propriétaire d'établissement/i);
    expect(analytics).toMatch(/propre fiche/i);
  });

  it("does not over-promise anonymity", () => {
    expect(analytics).not.toMatch(/liées à vous personnellement/i);
    expect(analytics).toMatch(/ne servent pas à vous identifier/i);
  });

  it("says the ids live in local storage and the only cookie excludes our own visits", () => {
    expect(cookies).toMatch(/stockage local/i);
    expect(cookies).toMatch(/notre propre équipe/i);
    expect(cookies).not.toMatch(/Un témoin \(cookie\) enregistre/);
  });
});
