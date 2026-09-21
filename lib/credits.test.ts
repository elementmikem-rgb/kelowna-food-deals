import { describe, it, expect } from "vitest";
import { centsToCredits, creditsToCents, CENTS_PER_CREDIT } from "./credits";

describe("CENTS_PER_CREDIT", () => {
  it("is a flat $1 = 1 credit peg", () => {
    expect(CENTS_PER_CREDIT).toBe(100);
  });
});

describe("centsToCredits", () => {
  it("converts a whole-dollar cents amount to credits", () => {
    expect(centsToCredits(300)).toBe(3);
    expect(centsToCredits(1000)).toBe(10);
  });

  it("throws on a non-whole-credit amount", () => {
    expect(() => centsToCredits(150)).toThrow();
    expect(() => centsToCredits(99)).toThrow();
  });

  it("throws on a non-integer input", () => {
    expect(() => centsToCredits(100.5)).toThrow();
  });

  it("handles zero", () => {
    expect(centsToCredits(0)).toBe(0);
  });
});

describe("creditsToCents", () => {
  it("converts credits back to cents", () => {
    expect(creditsToCents(3)).toBe(300);
    expect(creditsToCents(10)).toBe(1000);
    expect(creditsToCents(0)).toBe(0);
  });

  it("round-trips with centsToCredits", () => {
    for (const credits of [0, 1, 5, 10, 65]) {
      expect(centsToCredits(creditsToCents(credits))).toBe(credits);
    }
  });
});
