import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({ db: {}, venues: {}, regions: {} }));

import { matchRegionByCity, parsePosition, type RegionCityIndex } from "./regionMatch";

const index: RegionCityIndex = {
  cities: new Map([
    [1, new Set(["vancouver"])],
    [2, new Set(["north vancouver", "west vancouver"])],
    [10, new Set(["calgary", "airdrie"])],
    [11, new Set(["calgary"])],
    [12, new Set(["calgary"])],
    [20, new Set(["quebec", "levis"])],
  ]),
  centers: new Map([
    [10, { lat: 51.05, lng: -114.07 }],
    [11, { lat: 51.12, lng: -113.95 }],
    [12, { lat: 50.95, lng: -114.05 }],
  ]),
};

describe("matchRegionByCity", () => {
  it("matches the exact city, so North Vancouver is not Vancouver", () => {
    expect(matchRegionByCity("Vancouver", null, index)).toBe(1);
    expect(matchRegionByCity("North Vancouver", null, index)).toBe(2);
  });

  it("ignores case, spacing and accents", () => {
    expect(matchRegionByCity("  QUÉBEC ", null, index)).toBe(20);
  });

  it("returns null for a city no region has", () => {
    expect(matchRegionByCity("Lambertville", null, index)).toBeNull();
    expect(matchRegionByCity("", null, index)).toBeNull();
  });

  it("splits a city shared by several regions by the nearest region centre", () => {
    expect(matchRegionByCity("Calgary", { lat: 51.13, lng: -113.96 }, index)).toBe(11);
    expect(matchRegionByCity("Calgary", { lat: 50.94, lng: -114.06 }, index)).toBe(12);
  });

  it("will not guess for a shared city when the position is unknown", () => {
    expect(matchRegionByCity("Calgary", null, index)).toBeNull();
  });
});

describe("parsePosition", () => {
  it("reads Showpass's lat,lng text", () => {
    expect(parsePosition("49.27978539999999,-123.1216553")).toEqual({ lat: 49.27978539999999, lng: -123.1216553 });
    expect(parsePosition("nonsense")).toBeNull();
    expect(parsePosition(null)).toBeNull();
  });
});
