import { describe, it, expect } from "vitest";
import { pickOutreachVariant, PLAIN_SHARE } from "./outreach-variant";

describe("pickOutreachVariant (which first-contact email style a venue gets)", () => {
  it("gives the same answer every time for the same venue, so a retried send never flips style", () => {
    for (const id of [1, 2, 10, 553, 9191]) {
      expect(pickOutreachVariant(id)).toBe(pickOutreachVariant(id));
    }
  });

  it("sends plain to 90% of venues and keeps 10% on branded as a control", () => {
    let plain = 0;
    const n = 10_000;
    for (let id = 1; id <= n; id++) if (pickOutreachVariant(id) === "plain") plain++;
    expect(plain / n).toBeCloseTo(0.9, 5);
    expect(PLAIN_SHARE).toBe(0.9);
  });

  it("does not follow even or odd venue numbers any more", () => {
    const evens = Array.from({ length: 200 }, (_, i) => (i + 1) * 2).map(pickOutreachVariant);
    const odds = Array.from({ length: 200 }, (_, i) => (i + 1) * 2 - 1).map(pickOutreachVariant);
    expect(evens.filter((v) => v === "plain").length).toBeGreaterThan(150);
    expect(odds.filter((v) => v === "plain").length).toBeGreaterThan(150);
  });

  it("spreads the branded control evenly through the venue numbers", () => {
    const branded = Array.from({ length: 100 }, (_, i) => i + 1).filter((id) => pickOutreachVariant(id) === "branded");
    expect(branded).toHaveLength(10);
  });
});
