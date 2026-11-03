import { describe, it, expect } from "vitest";
import { previousSpecialsCutoff, PREVIOUS_SPECIALS_DAYS } from "./previous-specials-window";

describe("previousSpecialsCutoff", () => {
  it("is 30 days before now", () => {
    expect(PREVIOUS_SPECIALS_DAYS).toBe(30);
    const now = new Date("2026-11-02T12:00:00Z");
    expect(previousSpecialsCutoff(now).toISOString()).toBe("2026-10-03T12:00:00.000Z");
  });

  it("does not change the date it is given", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    previousSpecialsCutoff(now);
    expect(now.toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });
});
