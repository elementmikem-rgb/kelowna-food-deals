import { describe, it, expect } from "vitest";
import { weeklyDigestsEnabled } from "./weekly-digest-switch";

describe("weeklyDigestsEnabled", () => {
  it("is off when the variable is unset", () => {
    expect(weeklyDigestsEnabled({})).toBe(false);
  });
  it("is off for any value other than 1", () => {
    expect(weeklyDigestsEnabled({ WEEKLY_DIGEST_ENABLED: "0" })).toBe(false);
    expect(weeklyDigestsEnabled({ WEEKLY_DIGEST_ENABLED: "true" })).toBe(false);
    expect(weeklyDigestsEnabled({ WEEKLY_DIGEST_ENABLED: "" })).toBe(false);
  });
  it("is on only when the variable is 1", () => {
    expect(weeklyDigestsEnabled({ WEEKLY_DIGEST_ENABLED: "1" })).toBe(true);
  });
});
