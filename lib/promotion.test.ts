import { describe, expect, it } from "vitest";
import { isPromotionActive } from "./promotion";

describe("isPromotionActive", () => {
  it("is true for a future date", () => {
    expect(isPromotionActive(new Date(Date.now() + 60_000))).toBe(true);
  });

  it("is false for a past date", () => {
    expect(isPromotionActive(new Date(Date.now() - 60_000))).toBe(false);
  });

  it("is false for null", () => {
    expect(isPromotionActive(null)).toBe(false);
  });

  it("is false for undefined -- a select() missing this column reads as undefined, not null; crashed in production before this guard existed", () => {
    expect(isPromotionActive(undefined)).toBe(false);
  });
});
