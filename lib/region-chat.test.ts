import { describe, expect, it } from "vitest";
import { runningToday, formatPrice, validateQuestion, QuestionTooLongError, sortFeaturedFirst, chatDetail, questionTokens, venueNamed, selectMatchingSpecials } from "./region-chat";

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

describe("chatDetail", () => {
  it("includes a long description so grouped items and prices reach the chat", () => {
    expect(chatDetail("House wine 5oz/8oz $5/$8, OJ's draught 14oz $5, Red Bull $4")).toBe(
      " -- House wine 5oz/8oz $5/$8, OJ's draught 14oz $5, Red Bull $4"
    );
  });

  it("leaves out null and short title-restating descriptions", () => {
    expect(chatDetail(null)).toBe("");
    expect(chatDetail("Happy hour draught")).toBe("");
  });

  it("truncates a very long description", () => {
    const out = chatDetail("x".repeat(400));
    expect(out.length).toBeLessThan(170);
    expect(out.endsWith("...")).toBe(true);
  });
});

describe("question-aware matching", () => {
  const sp = (venueId: number, venueName: string, title: string, description: string | null = null) => ({
    venueId, venueName, title, description,
  });

  it("drops filler words and singularizes", () => {
    expect([...questionTokens("What are the cheapest wings near me?")]).toEqual(["wing"]);
  });

  it("recognises a venue named in the question", () => {
    const tokens = questionTokens("cheapest drinks at Original Joe's in West Kelowna");
    expect(venueNamed("Original Joe's West Kelowna", tokens)).toBe(true);
    expect(venueNamed("Turtle Jack's Kitchen & Bar", tokens)).toBe(false);
  });

  it("does not treat a generic word as naming a venue", () => {
    expect(venueNamed("The Pub", questionTokens("any good pub tonight"))).toBe(false);
  });

  it("puts every special of a named venue first, capped per venue", () => {
    const rows = [
      sp(1, "Other Bar", "Wing Night", "half price wings"),
      ...Array.from({ length: 20 }, (_, i) => sp(2, "Original Joe's West Kelowna", `Deal ${i}`)),
    ];
    const out = selectMatchingSpecials(rows, "what does Original Joe's have");
    expect(out[0].venueId).toBe(2);
    expect(out.filter((r) => r.venueId === 2)).toHaveLength(12);
  });

  it("matches items by words in the title or description", () => {
    const rows = [
      sp(1, "A", "Happy Hour Drinks", "House wine $5, Lawn Mower Lager $5.50"),
      sp(2, "B", "Taco Tuesday", "tacos"),
    ];
    expect(selectMatchingSpecials(rows, "cheapest lager?").map((r) => r.venueId)).toEqual([1]);
  });

  it("returns nothing for a generic question", () => {
    expect(selectMatchingSpecials([sp(1, "A", "Happy Hour")], "best happy hour tonight?")).toEqual([]);
  });
});
