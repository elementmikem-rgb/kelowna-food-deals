import { describe, it, expect } from "vitest";
import { decideSuppression, normalizeAddress } from "./suppression";

const none = { unsubscribedVenues: 0, blocked: false, bounced: false };

describe("normalizeAddress", () => {
  it("lower-cases and trims", () => {
    expect(normalizeAddress("  Info@CraftBeerMarket.CA ")).toBe("info@craftbeermarket.ca");
  });
});

describe("decideSuppression", () => {
  it("allows an address with no unsubscribe, block or bounce", () => {
    expect(decideSuppression(none)).toBeNull();
  });

  it("suppresses an address that any venue sharing it unsubscribed from", () => {
    expect(decideSuppression({ ...none, unsubscribedVenues: 1 })).toMatch(/unsubscribed/);
    expect(decideSuppression({ ...none, unsubscribedVenues: 3 })).toMatch(/unsubscribed/);
  });

  it("suppresses a blocked sender", () => {
    expect(decideSuppression({ ...none, blocked: true })).toMatch(/blocked/);
  });

  it("suppresses an address that bounced", () => {
    expect(decideSuppression({ ...none, bounced: true })).toMatch(/bounced/);
  });

  it("explains the unsubscribe case first when several apply", () => {
    expect(decideSuppression({ unsubscribedVenues: 1, blocked: true, bounced: true })).toMatch(/unsubscribed/);
  });
});
