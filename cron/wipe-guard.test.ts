import { describe, it, expect } from "vitest";
import { shouldHoldEmptyExtraction } from "./wipe-guard";

describe("shouldHoldEmptyExtraction", () => {
  it("holds an empty extraction when the venue has 3 or more active specials", () => {
    expect(shouldHoldEmptyExtraction(3, 0)).toBe(true);
    expect(shouldHoldEmptyExtraction(40, 0)).toBe(true);
  });
  it("lets a small venue go to zero", () => {
    expect(shouldHoldEmptyExtraction(0, 0)).toBe(false);
    expect(shouldHoldEmptyExtraction(1, 0)).toBe(false);
    expect(shouldHoldEmptyExtraction(2, 0)).toBe(false);
  });
  it("never holds a non-empty extraction", () => {
    expect(shouldHoldEmptyExtraction(40, 1)).toBe(false);
    expect(shouldHoldEmptyExtraction(3, 12)).toBe(false);
  });
});
