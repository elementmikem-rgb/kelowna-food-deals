import { describe, expect, it } from "vitest";
import { isCandidate } from "./discover";

const ORIGIN = "https://www.mccurdybowl.com";

describe("isCandidate", () => {
  it("rejects an individual event-detail permalink (Squarespace-style), matched only by the weak 'event' keyword", () => {
    expect(
      isCandidate(
        `${ORIGIN}/event-details/wednesday-night-car-show-2022-09-14-17-00`,
        "",
        ORIGIN,
        true
      )
    ).toBe(false);
  });

  it("still accepts the bare events/calendar listing page", () => {
    expect(isCandidate(`${ORIGIN}/events`, "", ORIGIN, true)).toBe(true);
    expect(isCandidate(`${ORIGIN}/event-details`, "", ORIGIN, true)).toBe(true);
  });

  it("still accepts an event-section sub-page that also matches a strong keyword", () => {
    expect(isCandidate(`${ORIGIN}/events/happy-hour-menu`, "", ORIGIN, true)).toBe(true);
  });

  it("still accepts a genuine happy-hour/menu page outside any events section", () => {
    expect(isCandidate(`${ORIGIN}/menu`, "", ORIGIN, true)).toBe(true);
    expect(isCandidate(`${ORIGIN}/happy-hour`, "", ORIGIN, true)).toBe(true);
  });

  it("rejects a page with no matching keyword at all", () => {
    expect(isCandidate(`${ORIGIN}/about-us`, "", ORIGIN, true)).toBe(false);
  });
});
