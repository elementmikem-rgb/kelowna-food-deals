import { describe, it, expect } from "vitest";
import { liveStatus, statusLabel, statusRank, nowMinutesInRegion } from "./live-status";

const at = (h: number, m = 0) => h * 60 + m;

describe("liveStatus", () => {
  it("is live inside the window and says how long is left", () => {
    expect(liveStatus("15:00:00", "17:00:00", at(16, 15))).toEqual({ kind: "live", leftMin: 45 });
  });

  it("is soon before the window, with minutes until it starts", () => {
    expect(liveStatus("15:00:00", "17:00:00", at(14, 20))).toEqual({ kind: "soon", inMin: 40 });
  });

  it("has ended after the window", () => {
    expect(liveStatus("15:00:00", "17:00:00", at(17, 0))).toEqual({ kind: "ended" });
    expect(liveStatus("15:00:00", "17:00:00", at(22, 0))).toEqual({ kind: "ended" });
  });

  it("handles windows that run past midnight, on both sides of midnight", () => {
    expect(liveStatus("22:00:00", "02:00:00", at(23, 0))).toEqual({ kind: "live", leftMin: 180 });
    expect(liveStatus("22:00:00", "02:00:00", at(1, 0))).toEqual({ kind: "live", leftMin: 60 });
    expect(liveStatus("22:00:00", "02:00:00", at(12, 0))).toEqual({ kind: "soon", inMin: 600 });
  });

  it("treats a start with no end as on from the start, with no time left to promise", () => {
    expect(liveStatus("11:00:00", null, at(12, 0))).toEqual({ kind: "live", leftMin: null });
    expect(liveStatus("11:00:00", null, at(9, 30))).toEqual({ kind: "soon", inMin: 90 });
  });

  it("never claims anything about a special with no saved time", () => {
    expect(liveStatus(null, null, at(12, 0))).toEqual({ kind: "allday" });
    expect(liveStatus(null, "17:00:00", at(12, 0))).toEqual({ kind: "allday" });
  });
});

describe("statusLabel", () => {
  it("reads naturally in English", () => {
    expect(statusLabel({ kind: "live", leftMin: 135 }, "15:00:00", "en")).toBe("On now · 2h 15m left");
    expect(statusLabel({ kind: "live", leftMin: 45 }, "15:00:00", "en")).toBe("On now · 45 min left");
    expect(statusLabel({ kind: "live", leftMin: null }, "11:00:00", "en")).toBe("On now · from 11AM");
    expect(statusLabel({ kind: "soon", inMin: 40 }, "15:00:00", "en")).toBe("Starts in 40 min");
    expect(statusLabel({ kind: "soon", inMin: 300 }, "17:00:00", "en")).toBe("Starts 5PM");
    expect(statusLabel({ kind: "ended" }, "15:00:00", "en")).toBe("Ended");
    expect(statusLabel({ kind: "allday" }, null, "en")).toBeNull();
  });

  it("reads in French", () => {
    expect(statusLabel({ kind: "live", leftMin: 45 }, "15:00:00", "fr")).toBe("En cours · encore 45 min");
    expect(statusLabel({ kind: "soon", inMin: 40 }, "15:00:00", "fr")).toBe("Commence dans 40 min");
  });
});

describe("statusRank", () => {
  it("puts something on now first, upcoming or untimed next, finished last", () => {
    expect(statusRank([{ kind: "ended" }, { kind: "live", leftMin: 10 }])).toBe(0);
    expect(statusRank([{ kind: "soon", inMin: 30 }, { kind: "ended" }])).toBe(1);
    expect(statusRank([{ kind: "allday" }])).toBe(1);
    expect(statusRank([{ kind: "ended" }])).toBe(2);
  });
});

describe("nowMinutesInRegion", () => {
  it("reads the clock in the region's own time zone", () => {
    // 17:30 UTC on 2026-11-05 is 12:30 in Toronto (EST, UTC-5).
    expect(nowMinutesInRegion("America/Toronto", new Date("2026-11-05T17:30:00Z"))).toBe(at(12, 30));
  });
});
