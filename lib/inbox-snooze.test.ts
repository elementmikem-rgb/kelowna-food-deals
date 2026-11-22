import { describe, it, expect } from "vitest";
import { snoozeUntilFor, isSnoozedNow, SNOOZE_PRESETS } from "./inbox-snooze";

// Sunday 2026-11-22 12:30 in Vancouver (PST, UTC-8 in November).
const NOW = new Date("2026-11-22T20:30:00Z");

describe("snoozeUntilFor", () => {
  it("later_today is three hours from now", () => {
    expect(snoozeUntilFor("later_today", NOW).toISOString()).toBe("2026-11-22T23:30:00.000Z");
  });

  it("tomorrow is 9:00 Vancouver time the next day", () => {
    expect(snoozeUntilFor("tomorrow", NOW).toISOString()).toBe("2026-11-23T17:00:00.000Z");
  });

  it("in_3_days is 9:00 Vancouver time three days out", () => {
    expect(snoozeUntilFor("in_3_days", NOW).toISOString()).toBe("2026-11-25T17:00:00.000Z");
  });

  it("next_week is the Monday after tomorrow's Monday when today is Sunday, so it never equals tomorrow", () => {
    expect(snoozeUntilFor("next_week", NOW).toISOString()).toBe("2026-11-30T17:00:00.000Z");
  });

  it("next_week from a Wednesday is the coming Monday at 9:00", () => {
    // Wed 2026-11-25 10:00 PST
    expect(snoozeUntilFor("next_week", new Date("2026-11-25T18:00:00Z")).toISOString()).toBe("2026-11-30T17:00:00.000Z");
  });

  it("uses the clock in Vancouver, not UTC, so late evening Pacific still means tomorrow Pacific", () => {
    // Sun 2026-11-22 21:00 PST == Mon 05:00Z. Tomorrow (Pacific) is Mon the 23rd.
    expect(snoozeUntilFor("tomorrow", new Date("2026-11-23T05:00:00Z")).toISOString()).toBe("2026-11-23T17:00:00.000Z");
  });

  it("handles the daylight saving offset (PDT, UTC-7) in summer", () => {
    // Mon 2026-07-06 12:00 PDT
    expect(snoozeUntilFor("tomorrow", new Date("2026-07-06T19:00:00Z")).toISOString()).toBe("2026-07-07T16:00:00.000Z");
  });

  it("exposes labelled presets for the menu", () => {
    expect(SNOOZE_PRESETS.map((p) => p.id)).toEqual(["later_today", "tomorrow", "in_3_days", "next_week"]);
    expect(SNOOZE_PRESETS.every((p) => p.label.length > 0)).toBe(true);
  });
});

describe("isSnoozedNow", () => {
  const base = { snoozedUntil: "2026-11-25T17:00:00.000Z", updatedAt: "2026-11-22T20:30:00.000Z" };

  it("is snoozed while the wake time is in the future", () => {
    expect(isSnoozedNow(base, null, NOW)).toBe(true);
  });

  it("is not snoozed once the wake time has passed", () => {
    expect(isSnoozedNow(base, null, new Date("2026-11-25T17:00:01Z"))).toBe(false);
  });

  it("wakes early when the venue replies after the snooze was set", () => {
    expect(isSnoozedNow(base, "2026-11-23T10:00:00.000Z", NOW)).toBe(false);
  });

  it("stays snoozed when the last reply is older than the snooze", () => {
    expect(isSnoozedNow(base, "2026-11-20T10:00:00.000Z", NOW)).toBe(true);
  });

  it("is not snoozed with no state or no wake time", () => {
    expect(isSnoozedNow(null, null, NOW)).toBe(false);
    expect(isSnoozedNow({ snoozedUntil: null, updatedAt: base.updatedAt }, null, NOW)).toBe(false);
  });
});
