import { describe, it, expect } from "vitest";
import { formatOwnerFunnel } from "./inbox-venue-format";

describe("formatOwnerFunnel (where an owner is in the funnel)", () => {
  it("says nothing for a venue that has not claimed its listing", () => {
    expect(formatOwnerFunnel({ claimed: false, creditBalance: 0, activeBoosts: 0, photoCount: 3 })).toBeNull();
  });
  it("shows credits, Boost state and photos for a claimed venue", () => {
    expect(formatOwnerFunnel({ claimed: true, creditBalance: 10, activeBoosts: 0, photoCount: 1 })).toBe(
      "10 credits, no active Boost, 1 photo"
    );
  });
  it("handles singular and plural and an active Boost", () => {
    expect(formatOwnerFunnel({ claimed: true, creditBalance: 1, activeBoosts: 1, photoCount: 0 })).toBe(
      "1 credit, 1 active Boost, no photos"
    );
    expect(formatOwnerFunnel({ claimed: true, creditBalance: 0, activeBoosts: 2, photoCount: 4 })).toBe(
      "0 credits, 2 active Boosts, 4 photos"
    );
  });
});
