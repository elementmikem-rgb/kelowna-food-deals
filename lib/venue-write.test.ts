import { describe, it, expect } from "vitest";
import { buildSpecialRows, appendNote, normalizeTime, normalizePhone } from "./venue-write";

const NOW = new Date("2026-11-22T21:00:00Z");
const venue = { id: 4828, regionId: 83 };

describe("buildSpecialRows", () => {
  it("makes one row per day with the hand-entry fields the nightly cron needs", () => {
    const rows = buildSpecialRows(venue, { title: "Chicken wings", priceCents: 100, daysOfWeek: [6], category: "wing_night" }, NOW, "2026-11-22");
    expect(rows).toEqual([
      {
        venueId: 4828,
        regionId: 83,
        title: "Chicken wings",
        description: null,
        priceCents: 100,
        dayOfWeek: 6,
        isMonthly: false,
        startTime: null,
        endTime: null,
        category: "wing_night",
        lastVerifiedAt: NOW,
        sourceUrl: null,
        confidence: 1,
        extractionNotes: "Hand-entered 2026-11-22 from the venue's email reply (admin inbox).",
      },
    ]);
  });

  it("never sets a source url, so the nightly cron does not archive a hand-entered special", () => {
    const rows = buildSpecialRows(venue, { title: "Pints", daysOfWeek: [1, 2], category: "happy_hour" }, NOW, "2026-11-22");
    expect(rows.every((r) => r.sourceUrl === null)).toBe(true);
  });

  it("splits several days into one row each", () => {
    const rows = buildSpecialRows(venue, { title: "Pints", daysOfWeek: [1, 3, 5], category: "happy_hour", startTime: "16:00", endTime: "18:00" }, NOW, "2026-11-22");
    expect(rows.map((r) => r.dayOfWeek)).toEqual([1, 3, 5]);
    expect(rows.every((r) => r.startTime === "16:00" && r.endTime === "18:00")).toBe(true);
  });

  it("uses a single daily row when no days or all seven days are given", () => {
    expect(buildSpecialRows(venue, { title: "Pints", daysOfWeek: [], category: "other" }, NOW, "2026-11-22").map((r) => r.dayOfWeek)).toEqual([null]);
    expect(buildSpecialRows(venue, { title: "Pints", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], category: "other" }, NOW, "2026-11-22").map((r) => r.dayOfWeek)).toEqual([null]);
  });

  it("drops duplicate and out-of-range days", () => {
    const rows = buildSpecialRows(venue, { title: "Pints", daysOfWeek: [2, 2, 9, -1, 4], category: "other" }, NOW, "2026-11-22");
    expect(rows.map((r) => r.dayOfWeek)).toEqual([2, 4]);
  });

  it("trims the title and turns blank text into null", () => {
    const rows = buildSpecialRows(venue, { title: "  Wings  ", description: "   ", daysOfWeek: [6], category: "wing_night" }, NOW, "2026-11-22");
    expect(rows[0].title).toBe("Wings");
    expect(rows[0].description).toBeNull();
  });
});

describe("normalizeTime", () => {
  it("accepts HH:MM and H:MM and rejects nonsense", () => {
    expect(normalizeTime("16:00")).toBe("16:00");
    expect(normalizeTime("9:30")).toBe("09:30");
    expect(normalizeTime("25:00")).toBeNull();
    expect(normalizeTime("abc")).toBeNull();
    expect(normalizeTime("")).toBeNull();
    expect(normalizeTime(null)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("formats a ten digit number the way the listings show it", () => {
    expect(normalizePhone("(819) 860-6646")).toBe("819 860-6646");
    expect(normalizePhone("+1 819.860.6646")).toBe("819 860-6646");
  });

  it("returns null when it is not a ten digit North American number", () => {
    expect(normalizePhone("860-6646")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("appendNote", () => {
  it("adds a dated line to an existing note", () => {
    expect(appendNote("old note.", "2026-11-22", "owner confirmed $1 wings")).toBe("old note. 2026-11-22 update: owner confirmed $1 wings");
  });

  it("starts a note when there is none", () => {
    expect(appendNote(null, "2026-11-22", "phone updated")).toBe("2026-11-22 update: phone updated");
  });
});
