import { describe, it, expect } from "vitest";
import { haversineKm, sortByDistance, formatDistance } from "./nearest";

// Downtown Kelowna ~ (49.8880, -119.4960); Rutland ~ (49.8860, -119.3950); Peachland ~ (49.7730, -119.7260)
const downtown = { lat: 49.888, lng: -119.496 };
const rutland = { lat: 49.886, lng: -119.395 };
const peachland = { lat: 49.773, lng: -119.726 };

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(downtown, downtown)).toBeCloseTo(0, 5);
  });

  it("gives a plausible real-world distance (downtown to Rutland is roughly 7 km)", () => {
    const km = haversineKm(downtown, rutland);
    expect(km).toBeGreaterThan(6);
    expect(km).toBeLessThan(8.5);
  });

  it("is symmetric", () => {
    expect(haversineKm(downtown, peachland)).toBeCloseTo(haversineKm(peachland, downtown), 6);
  });
});

describe("sortByDistance", () => {
  const items = [
    { id: "peachland", point: peachland },
    { id: "downtown", point: downtown },
    { id: "rutland", point: rutland },
  ];

  it("orders items nearest to farthest from the visitor", () => {
    const sorted = sortByDistance(items, (i) => i.point, downtown);
    expect(sorted.map((s) => s.item.id)).toEqual(["downtown", "rutland", "peachland"]);
    expect(sorted[0].distanceKm).toBeCloseTo(0, 3);
  });

  it("puts items with no usable coordinates last, in their original order, with no distance", () => {
    const withMissing = [
      { id: "unknown-a", point: null },
      { id: "peachland", point: peachland },
      { id: "unknown-b", point: null },
      { id: "downtown", point: downtown },
    ];
    const sorted = sortByDistance(withMissing, (i) => i.point, downtown);
    expect(sorted.map((s) => s.item.id)).toEqual(["downtown", "peachland", "unknown-a", "unknown-b"]);
    expect(sorted[2].distanceKm).toBeNull();
    expect(sorted[3].distanceKm).toBeNull();
  });

  it("does not mutate the input array", () => {
    const copy = [...items];
    sortByDistance(items, (i) => i.point, downtown);
    expect(items).toEqual(copy);
  });
});

describe("formatDistance", () => {
  it("shows metres, rounded to 50, for under a kilometre", () => {
    expect(formatDistance(0.43, "en")).toBe("450 m");
    expect(formatDistance(0.02, "en")).toBe("50 m");
  });

  it("shows one decimal under 10 km and whole km above", () => {
    expect(formatDistance(1.24, "en")).toBe("1.2 km");
    expect(formatDistance(12.6, "en")).toBe("13 km");
  });

  it("uses a decimal comma in French", () => {
    expect(formatDistance(1.24, "fr")).toBe("1,2 km");
  });
});
