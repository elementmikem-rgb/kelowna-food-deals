import { describe, it, expect } from "vitest";
import { formatListDate, formatMessageDate, formatCount } from "./inbox-format";

// Nov 22, 2026, 10:00 AM Pacific (UTC-8 in November -> 18:00 UTC)
const NOW = new Date("2026-11-22T18:00:00Z");
const TZ = "America/Vancouver";

describe("formatListDate", () => {
  it("shows time (AM/PM) for a message from the same calendar day in Pacific", () => {
    // 2026-11-22 06:30 AM Pacific = 14:30 UTC
    const result = formatListDate("2026-11-22T14:30:00Z", NOW, TZ);
    expect(result).toMatch(/AM|PM/);
    expect(result).toMatch(/6:30/);
  });

  it("shows month and day for same year, different day (no year)", () => {
    // Nov 19, 2026 -- same year as NOW but different day
    const result = formatListDate("2026-11-19T20:00:00Z", NOW, TZ);
    expect(result).toContain("Nov");
    expect(result).toContain("19");
    expect(result).not.toContain("2026");
  });

  it("shows month, day and year for a message from a previous year", () => {
    const result = formatListDate("2024-11-19T20:00:00Z", NOW, TZ);
    expect(result).toContain("Nov");
    expect(result).toContain("19");
    expect(result).toContain("2024");
  });

  it("is deterministic for a fixed now", () => {
    const r1 = formatListDate("2026-11-22T14:30:00Z", NOW, TZ);
    const r2 = formatListDate("2026-11-22T14:30:00Z", NOW, TZ);
    expect(r1).toBe(r2);
  });

  it("respects the tz parameter - shows date not time for cross-midnight difference", () => {
    // 01:00 UTC on Nov 22 is still Nov 21 in Pacific (UTC-8), so different calendar day
    const result = formatListDate("2026-11-22T01:00:00Z", NOW, TZ);
    expect(result).toContain("Nov");
    // Should not show a time (AM/PM), since it is a different day in Pacific
    expect(result).not.toMatch(/AM|PM/);
  });

  it("uses default tz of America/Vancouver", () => {
    const withTz = formatListDate("2026-11-19T20:00:00Z", NOW, "America/Vancouver");
    const withDefault = formatListDate("2026-11-19T20:00:00Z", NOW);
    expect(withTz).toBe(withDefault);
  });
});

describe("formatMessageDate", () => {
  it("includes date, year and relative part", () => {
    // 3 days before NOW (3 * 24h exactly)
    const iso = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatMessageDate(iso, NOW, TZ);
    expect(result).toContain("2026");
    expect(result).toContain("days ago");
    expect(result).toMatch(/\(.*ago\)/);
  });

  it("shows just now for messages under 1 minute old", () => {
    const justNow = new Date(NOW.getTime() - 10_000).toISOString();
    const result = formatMessageDate(justNow, NOW, TZ);
    expect(result).toContain("just now");
  });

  it("shows minutes ago for messages under an hour old", () => {
    const thirtyMinsAgo = new Date(NOW.getTime() - 30 * 60 * 1000).toISOString();
    const result = formatMessageDate(thirtyMinsAgo, NOW, TZ);
    expect(result).toContain("30 minutes ago");
  });

  it("shows 1 minute ago (singular) for exactly 1 minute", () => {
    const oneMinAgo = new Date(NOW.getTime() - 60 * 1000).toISOString();
    const result = formatMessageDate(oneMinAgo, NOW, TZ);
    expect(result).toContain("1 minute ago");
  });

  it("shows hours ago for messages under a day old", () => {
    const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const result = formatMessageDate(twoHoursAgo, NOW, TZ);
    expect(result).toContain("2 hours ago");
  });

  it("shows 1 hour ago (singular) for exactly 1 hour", () => {
    const oneHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();
    const result = formatMessageDate(oneHourAgo, NOW, TZ);
    expect(result).toContain("1 hour ago");
  });

  it("shows 1 day ago (singular) for exactly 1 day", () => {
    const oneDayAgo = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const result = formatMessageDate(oneDayAgo, NOW, TZ);
    expect(result).toContain("1 day ago");
  });

  it("shows AM/PM in the date part", () => {
    const iso = "2026-11-19T14:30:00Z";
    const result = formatMessageDate(iso, NOW, TZ);
    expect(result).toMatch(/AM|PM/);
  });

  it("is deterministic for a fixed now", () => {
    const iso = "2026-11-19T14:30:00Z";
    const r1 = formatMessageDate(iso, NOW, TZ);
    const r2 = formatMessageDate(iso, NOW, TZ);
    expect(r1).toBe(r2);
  });
});

describe("formatCount", () => {
  it("shows range and total for a standard page (default start=1)", () => {
    expect(formatCount(50, 120)).toBe("1-50 of 120");
  });

  it("respects start parameter", () => {
    expect(formatCount(50, 120, 51)).toBe("51-100 of 120");
  });

  it("shows 0 of 0 when total is zero", () => {
    expect(formatCount(0, 0)).toBe("0 of 0");
  });

  it("shows 1-5 of 5 for a single partial page", () => {
    expect(formatCount(5, 5)).toBe("1-5 of 5");
  });

  it("handles last partial page", () => {
    // Page starts at 101, shows 20 items out of 120 total
    expect(formatCount(20, 120, 101)).toBe("101-120 of 120");
  });
});
