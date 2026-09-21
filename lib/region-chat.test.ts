import { describe, expect, it } from "vitest";
import { runningToday, formatPrice, validateQuestion, QuestionTooLongError, sortFeaturedFirst } from "./region-chat";

const fresh = new Date();

describe("runningToday", () => {
  it("includes a daily item (dayOfWeek null)", () => {
    const items = [{ dayOfWeek: null, lastVerifiedAt: fresh }];
    expect(runningToday(items, 3)).toHaveLength(1);
  });

  it("includes an item matching today's weekday", () => {
    const items = [{ dayOfWeek: 3, lastVerifiedAt: fresh }];
    expect(runningToday(items, 3)).toHaveLength(1);
  });

  it("excludes an item on a different weekday", () => {
    const items = [{ dayOfWeek: 2, lastVerifiedAt: fresh }];
    expect(runningToday(items, 3)).toHaveLength(0);
  });

  it("includes an explicit monthly promotion regardless of weekday", () => {
    const items = [{ dayOfWeek: 2, isMonthly: true, lastVerifiedAt: fresh }];
    expect(runningToday(items, 3)).toHaveLength(1);
  });

  it("excludes a stale item even if the day matches", () => {
    const staleDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
    const items = [{ dayOfWeek: 3, lastVerifiedAt: staleDate }];
    expect(runningToday(items, 3)).toHaveLength(0);
  });
});

describe("formatPrice", () => {
  it("formats cents as a dollar amount with a leading comma", () => {
    expect(formatPrice(850)).toBe(", $8.50");
  });

  it("returns an empty string for null (no price)", () => {
    expect(formatPrice(null)).toBe("");
  });
});

describe("sortFeaturedFirst", () => {
  it("moves a featured item ahead of non-featured items that came before it", () => {
    const items = [{ id: 1, featured: false }, { id: 2, featured: false }, { id: 3, featured: true }];
    const result = sortFeaturedFirst(items, (i) => i.featured);
    expect(result.map((i) => i.id)).toEqual([3, 1, 2]);
  });

  it("survives a slice that would otherwise crowd it out", () => {
    const items = [
      { id: "a", featured: false },
      { id: "b", featured: false },
      { id: "c", featured: true },
    ];
    const sliced = sortFeaturedFirst(items, (i) => i.featured).slice(0, 2);
    expect(sliced.some((i) => i.id === "c")).toBe(true);
  });

  it("preserves relative order within each group", () => {
    const items = [
      { id: 1, featured: true },
      { id: 2, featured: false },
      { id: 3, featured: true },
      { id: 4, featured: false },
    ];
    const result = sortFeaturedFirst(items, (i) => i.featured);
    expect(result.map((i) => i.id)).toEqual([1, 3, 2, 4]);
  });

  it("returns the list unchanged when nothing is featured", () => {
    const items = [{ id: 1, featured: false }, { id: 2, featured: false }];
    expect(sortFeaturedFirst(items, (i) => i.featured)).toEqual(items);
  });
});

describe("validateQuestion", () => {
  it("returns the trimmed question when valid", () => {
    expect(validateQuestion("  what's on tonight?  ")).toBe("what's on tonight?");
  });

  it("rejects an empty question", () => {
    expect(() => validateQuestion("   ")).toThrow(QuestionTooLongError);
  });

  it("rejects a question over 200 characters", () => {
    expect(() => validateQuestion("a".repeat(201))).toThrow(QuestionTooLongError);
  });

  it("accepts a question at exactly 200 characters", () => {
    expect(validateQuestion("a".repeat(200))).toHaveLength(200);
  });
});
