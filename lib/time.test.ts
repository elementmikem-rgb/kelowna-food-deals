import { describe, it, expect } from "vitest";
import { endOfDayPacific, regionTodayISODate } from "./time";

// 2026 US/Canada DST transitions: PST -> PDT on Mar 8, PDT -> PST on Nov 1.
describe("endOfDayPacific", () => {
  it("returns 23:59:59.999 Pacific, not UTC, for a PDT (summer) date", () => {
    // Pacific is UTC-7 in July, so the last millisecond of Jul 15 Pacific is
    // 06:59:59.999Z on Jul 16.
    expect(endOfDayPacific("2026-07-15").toISOString()).toBe("2026-07-16T06:59:59.999Z");
  });

  it("returns 23:59:59.999 Pacific for a PST (winter) date", () => {
    // Pacific is UTC-8 in January, so the last millisecond of Jan 15 Pacific is
    // 07:59:59.999Z on Jan 16.
    expect(endOfDayPacific("2026-01-15").toISOString()).toBe("2026-01-16T07:59:59.999Z");
  });

  it("handles the spring-forward day (ends in PDT)", () => {
    expect(endOfDayPacific("2026-03-08").toISOString()).toBe("2026-03-09T06:59:59.999Z");
  });

  it("handles the fall-back day (ends in PST)", () => {
    expect(endOfDayPacific("2026-11-01").toISOString()).toBe("2026-11-02T07:59:59.999Z");
  });

  it("is always later than the naive end-of-day-UTC it replaces", () => {
    for (const d of ["2026-01-15", "2026-03-08", "2026-07-15", "2026-11-01", "2026-12-31"]) {
      expect(endOfDayPacific(d).getTime()).toBeGreaterThan(new Date(`${d}T23:59:59.999Z`).getTime());
    }
  });

  it("still reports the input date in Pacific, and one ms later does not", () => {
    for (const d of ["2026-01-15", "2026-03-08", "2026-07-15", "2026-11-01"]) {
      const end = endOfDayPacific(d);
      expect(regionTodayISODate("America/Vancouver", end)).toBe(d);
      expect(regionTodayISODate("America/Vancouver", new Date(end.getTime() + 1))).not.toBe(d);
    }
  });
});

describe("regionTodayISODate", () => {
  it("resolves per timezone, not hardcoded Pacific", () => {
    // 2026-01-01 02:00 UTC is still 2025-12-31 in Vancouver (UTC-8) but already
    // 2026-01-01 in a UTC+1 timezone -- proves the timezone argument is load-bearing,
    // not a no-op parameter.
    const instant = new Date("2026-01-01T02:00:00Z");
    expect(regionTodayISODate("America/Vancouver", instant)).toBe("2025-12-31");
    expect(regionTodayISODate("Europe/Paris", instant)).toBe("2026-01-01");
  });
});
