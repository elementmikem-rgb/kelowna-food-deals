import { describe, it, expect } from "vitest";
import { rangesOverlap, isRangeAvailable } from "./booking-availability";

describe("rangesOverlap", () => {
  it("returns true when ranges overlap", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-10", "2026-10-05", "2026-10-15")).toBe(true);
  });
  it("returns true when one range is fully inside another", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-31", "2026-10-05", "2026-10-06")).toBe(true);
  });
  it("returns true when ranges touch on the boundary day", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-10", "2026-10-10", "2026-10-20")).toBe(true);
  });
  it("returns false when ranges don't overlap", () => {
    expect(rangesOverlap("2026-10-01", "2026-10-10", "2026-10-11", "2026-10-20")).toBe(false);
  });
});

describe("isRangeAvailable", () => {
  it("is always available when capCount is null (uncapped)", () => {
    const existing = [{ startDate: "2026-10-01", endDate: "2026-12-31" }];
    expect(isRangeAvailable(existing, "2026-10-15", "2026-10-20", null)).toBe(true);
  });

  it("is available when no existing bookings overlap", () => {
    const existing = [{ startDate: "2026-10-01", endDate: "2026-10-10" }];
    expect(isRangeAvailable(existing, "2026-10-11", "2026-10-20", 1)).toBe(true);
  });

  it("is not available when an overlap would meet or exceed the cap", () => {
    const existing = [{ startDate: "2026-10-01", endDate: "2026-10-20" }];
    expect(isRangeAvailable(existing, "2026-10-15", "2026-10-25", 1)).toBe(false);
  });

  it("is available when overlaps exist but stay under a higher cap", () => {
    const existing = [
      { startDate: "2026-10-01", endDate: "2026-10-20" },
      { startDate: "2026-10-05", endDate: "2026-10-15" },
    ];
    expect(isRangeAvailable(existing, "2026-10-10", "2026-10-12", 3)).toBe(true);
  });

  it("is not available when overlaps already meet a higher cap", () => {
    const existing = [
      { startDate: "2026-10-01", endDate: "2026-10-20" },
      { startDate: "2026-10-05", endDate: "2026-10-15" },
    ];
    expect(isRangeAvailable(existing, "2026-10-10", "2026-10-12", 2)).toBe(false);
  });
});
