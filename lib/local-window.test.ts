import { describe, it, expect } from "vitest";
import { localHour, inLocalWindow } from "./local-window";

describe("localHour", () => {
  it("gives the hour in the given timezone", () => {
    // 17:30 UTC is 09:30 in Vancouver (UTC-8 in winter) and 12:30 in Toronto (UTC-5)
    const t = new Date("2026-11-23T17:30:00Z");
    expect(localHour(t, "America/Vancouver")).toBe(9);
    expect(localHour(t, "America/Toronto")).toBe(12);
  });
  it("follows daylight saving time", () => {
    const summer = new Date("2026-07-15T16:30:00Z");
    expect(localHour(summer, "America/Vancouver")).toBe(9);
  });
});

describe("inLocalWindow (9:00 to 11:00 local by default)", () => {
  it("is true inside the window and false outside it", () => {
    expect(inLocalWindow(new Date("2026-11-23T17:30:00Z"), "America/Vancouver")).toBe(true);
    expect(inLocalWindow(new Date("2026-11-23T18:59:00Z"), "America/Vancouver")).toBe(true);
    expect(inLocalWindow(new Date("2026-11-23T19:00:00Z"), "America/Vancouver")).toBe(false);
    expect(inLocalWindow(new Date("2026-11-23T16:59:00Z"), "America/Vancouver")).toBe(false);
  });
  it("is per timezone", () => {
    const t = new Date("2026-11-23T14:30:00Z");
    expect(inLocalWindow(t, "America/Toronto")).toBe(true);
    expect(inLocalWindow(t, "America/Vancouver")).toBe(false);
  });
  it("is false for an unknown timezone instead of throwing", () => {
    expect(inLocalWindow(new Date(), "Not/AZone")).toBe(false);
  });
});
