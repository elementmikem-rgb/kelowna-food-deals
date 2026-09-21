import { describe, expect, it } from "vitest";
import { cadenceDaysFor, venuesToScrapeTonight } from "./rotation";

function fakeVenues(n: number): { id: number; neverScraped: boolean }[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, neverScraped: false }));
}

describe("cadenceDaysFor", () => {
  it("uses a 3-day cadence at or above 30 active venues", () => {
    expect(cadenceDaysFor(89)).toBe(3);
    expect(cadenceDaysFor(30)).toBe(3);
  });

  it("uses a 3-day cadence for 11-29 active venues", () => {
    expect(cadenceDaysFor(29)).toBe(3);
    expect(cadenceDaysFor(11)).toBe(3);
  });

  it("uses a 7-day cadence below 11 active venues", () => {
    expect(cadenceDaysFor(10)).toBe(7);
    expect(cadenceDaysFor(1)).toBe(7);
  });
});

describe("venuesToScrapeTonight", () => {
  it("caps an 89-venue region (Kelowna-sized) to a third", () => {
    expect(venuesToScrapeTonight(fakeVenues(89)).length).toBe(30);
  });

  it("caps a 49-venue region (Penticton-sized) to a third", () => {
    expect(venuesToScrapeTonight(fakeVenues(49)).length).toBe(17);
  });

  it("caps an 8-venue region to a seventh, rounded up", () => {
    expect(venuesToScrapeTonight(fakeVenues(8)).length).toBe(2);
  });

  it("returns an empty list unchanged", () => {
    expect(venuesToScrapeTonight([])).toEqual([]);
  });

  it("always includes a never-scraped venue sorted first in the input", () => {
    const venues = [
      { id: 0, neverScraped: true },
      ...fakeVenues(88).map((v) => ({ ...v, id: v.id + 1 })),
    ];
    const tonight = venuesToScrapeTonight(venues);
    expect(tonight.some((v) => v.neverScraped)).toBe(true);
  });
});
