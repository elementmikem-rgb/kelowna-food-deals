import { describe, expect, it } from "vitest";
import { fillBuckets, formatBucket, indexAtRatio, labelIndices, niceCeil, yTicks } from "./chart-axis";

describe("indexAtRatio", () => {
  it("maps a position across the chart to the nearest point", () => {
    expect(indexAtRatio(0, 5)).toBe(0);
    expect(indexAtRatio(1, 5)).toBe(4);
    expect(indexAtRatio(0.5, 5)).toBe(2);
    expect(indexAtRatio(0.26, 5)).toBe(1);
    expect(indexAtRatio(0.74, 5)).toBe(3);
  });
  it("clamps a position outside the chart", () => {
    expect(indexAtRatio(-0.4, 5)).toBe(0);
    expect(indexAtRatio(1.7, 5)).toBe(4);
  });
  it("handles a single point and an empty chart", () => {
    expect(indexAtRatio(0.8, 1)).toBe(0);
    expect(indexAtRatio(0.8, 0)).toBe(-1);
  });
});

describe("niceCeil", () => {
  it("rounds up to 1, 2 or 5 times a power of ten, never below 2", () => {
    expect(niceCeil(0)).toBe(2);
    expect(niceCeil(1)).toBe(2);
    expect(niceCeil(2)).toBe(2);
    expect(niceCeil(3)).toBe(5);
    expect(niceCeil(5)).toBe(5);
    expect(niceCeil(6)).toBe(10);
    expect(niceCeil(59)).toBe(100);
    expect(niceCeil(295)).toBe(500);
    expect(niceCeil(1035)).toBe(2000);
    expect(niceCeil(2598)).toBe(5000);
  });
});

describe("yTicks", () => {
  it("gives whole-number ticks from 0 to the top", () => {
    expect(yTicks(2)).toEqual([0, 1, 2]);
    expect(yTicks(5)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(yTicks(10)).toEqual([0, 5, 10]);
    expect(yTicks(20)).toEqual([0, 10, 20]);
    expect(yTicks(100)).toEqual([0, 50, 100]);
    expect(yTicks(500)).toEqual([0, 100, 200, 300, 400, 500]);
    expect(yTicks(2000)).toEqual([0, 1000, 2000]);
  });
});

describe("formatBucket", () => {
  it("formats a day bucket", () => {
    expect(formatBucket("2026-11-07")).toBe("Nov 7");
    expect(formatBucket("2026-10-08")).toBe("Oct 8");
  });
  it("formats an hour bucket as a clock time, with the date when asked", () => {
    expect(formatBucket("2026-11-07 09:00")).toBe("9 AM");
    expect(formatBucket("2026-11-07 15:00")).toBe("3 PM");
    expect(formatBucket("2026-11-07 00:00")).toBe("12 AM");
    expect(formatBucket("2026-11-07 12:00")).toBe("12 PM");
    expect(formatBucket("2026-11-07 09:00", true)).toBe("Nov 7, 9 AM");
  });
});

describe("labelIndices", () => {
  it("shows every point when there are few", () => {
    expect(labelIndices(0)).toEqual([]);
    expect(labelIndices(1)).toEqual([0]);
    expect(labelIndices(4)).toEqual([0, 1, 2, 3]);
  });
  it("spreads at most six labels evenly, always including the first and last", () => {
    const idx = labelIndices(30);
    expect(idx.length).toBeLessThanOrEqual(6);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(29);
    expect(new Set(idx).size).toBe(idx.length);
  });
});

describe("fillBuckets", () => {
  const row = (date: string, pageviews: number, visitors: number) => ({ date, pageviews, visitors });

  it("adds a zero for every quiet hour in a window of a day or less", () => {
    // 04:06 to 10:06 Pacific on Nov 7 (UTC-8)
    const from = new Date("2026-11-07T12:06:00Z");
    const to = new Date("2026-11-07T18:06:00Z");
    const out = fillBuckets([row("2026-11-07 06:00", 6, 3), row("2026-11-07 08:00", 47, 47)], from, to);
    expect(out.map((d) => d.date)).toEqual([
      "2026-11-07 04:00",
      "2026-11-07 05:00",
      "2026-11-07 06:00",
      "2026-11-07 07:00",
      "2026-11-07 08:00",
      "2026-11-07 09:00",
      "2026-11-07 10:00",
    ]);
    expect(out.map((d) => d.pageviews)).toEqual([0, 0, 6, 0, 47, 0, 0]);
    expect(out[2].visitors).toBe(3);
  });

  it("adds a zero for every quiet day in a longer window", () => {
    const from = new Date("2026-11-05T18:00:00Z");
    const to = new Date("2026-11-08T18:00:00Z");
    const out = fillBuckets([row("2026-11-07", 60, 55)], from, to);
    expect(out.map((d) => d.date)).toEqual(["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(out.map((d) => d.pageviews)).toEqual([0, 0, 60, 0]);
  });

  it("lists each day once across the daylight saving change", () => {
    const out = fillBuckets([], new Date("2026-03-07T20:00:00Z"), new Date("2026-03-10T20:00:00Z"));
    expect(out.map((d) => d.date)).toEqual(["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"]);
  });

  it("gives an all-zero series for an empty window", () => {
    const out = fillBuckets([], new Date("2026-11-07T17:00:00Z"), new Date("2026-11-07T18:00:00Z"));
    expect(out).toEqual([row("2026-11-07 09:00", 0, 0)]);
  });

  it("keeps a row that falls outside the window instead of dropping data", () => {
    const out = fillBuckets([row("2026-11-07 03:00", 4, 4)], new Date("2026-11-07T17:00:00Z"), new Date("2026-11-07T18:00:00Z"));
    expect(out.map((d) => d.date)).toEqual(["2026-11-07 03:00", "2026-11-07 09:00"]);
  });
});
