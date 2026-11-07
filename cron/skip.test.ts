import { describe, expect, it } from "vitest";
import { scrapeSkipReason } from "./skip";

describe("scrapeSkipReason", () => {
  it("does not skip an ordinary venue", () => {
    expect(scrapeSkipReason({ claimedAt: null, manualOnly: false })).toBeNull();
    expect(scrapeSkipReason({})).toBeNull();
  });

  it("skips a venue whose owner has claimed it", () => {
    expect(scrapeSkipReason({ claimedAt: new Date("2026-10-01") })).toBe("venue is owner-claimed");
  });

  it("skips a venue marked manual only, so the cron cannot add rows next to hand-entered ones", () => {
    expect(scrapeSkipReason({ claimedAt: null, manualOnly: true })).toBe("venue is manual only (hand-entered listing)");
  });

  it("reports the owner claim first when a venue is both claimed and manual only", () => {
    expect(scrapeSkipReason({ claimedAt: new Date("2026-10-01"), manualOnly: true })).toBe("venue is owner-claimed");
  });
});
