import { describe, it, expect } from "vitest";
import { createImpressionBatcher, IMPRESSION_LABEL_MAX } from "./impressions";

describe("createImpressionBatcher", () => {
  it("counts a venue once per page view, however many times its card is seen", () => {
    const b = createImpressionBatcher();
    expect(b.add(5)).toBe(true);
    expect(b.add(5)).toBe(false);
    expect(b.flush()).toEqual(["5"]);
  });

  it("joins everything pending into one comma separated label", () => {
    const b = createImpressionBatcher();
    b.add(1);
    b.add(22);
    b.add(333);
    expect(b.flush()).toEqual(["1,22,333"]);
  });

  it("flush empties the queue but remembers what it already sent", () => {
    const b = createImpressionBatcher();
    b.add(1);
    b.flush();
    expect(b.flush()).toEqual([]);
    expect(b.add(1)).toBe(false);
  });

  it("ignores ids that are not positive whole numbers", () => {
    const b = createImpressionBatcher();
    expect(b.add(0)).toBe(false);
    expect(b.add(-3)).toBe(false);
    expect(b.add(1.5)).toBe(false);
    expect(b.add(NaN)).toBe(false);
    expect(b.flush()).toEqual([]);
  });

  it("splits into several labels so none exceeds the length /api/track accepts", () => {
    const b = createImpressionBatcher();
    for (let i = 10000; i < 10100; i++) b.add(i);
    const labels = b.flush();
    expect(labels.length).toBeGreaterThan(1);
    for (const l of labels) expect(l.length).toBeLessThanOrEqual(IMPRESSION_LABEL_MAX);
    expect(labels.join(",").split(",")).toHaveLength(100);
  });

  it("reset forgets what was seen, for a new page", () => {
    const b = createImpressionBatcher();
    b.add(1);
    b.flush();
    b.reset();
    expect(b.add(1)).toBe(true);
  });
});
