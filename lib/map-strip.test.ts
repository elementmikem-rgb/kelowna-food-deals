import { describe, it, expect } from "vitest";
import { pickStripPins } from "./map-strip";
import { bestDeal } from "../components/MapVenueStrip";

const pin = (venueId: number, lat: number, lng: number) => ({ venueId, lat, lng });
const view = {
  center: { lat: 49.88, lng: -119.5 },
  bounds: { north: 49.95, south: 49.8, east: -119.4, west: -119.6 },
};

describe("pickStripPins", () => {
  it("keeps only pins in view, nearest the center first", () => {
    const pins = [pin(1, 49.93, -119.5), pin(2, 49.881, -119.5), pin(3, 50.5, -119.5)];
    expect(pickStripPins(pins, view, null).map((p) => p.venueId)).toEqual([2, 1]);
  });

  it("caps the list", () => {
    const pins = Array.from({ length: 50 }, (_, i) => pin(i + 1, 49.85 + i * 0.001, -119.5));
    expect(pickStripPins(pins, view, null, 30)).toHaveLength(30);
  });

  it("always keeps the selected venue, first, even when it is out of view", () => {
    const pins = [pin(1, 49.881, -119.5), pin(9, 55, -110)];
    expect(pickStripPins(pins, view, 9).map((p) => p.venueId)).toEqual([9, 1]);
  });

  it("falls back to the first pins before there is a view", () => {
    const pins = [pin(1, 1, 1), pin(2, 2, 2), pin(3, 3, 3)];
    expect(pickStripPins(pins, null, null, 2).map((p) => p.venueId)).toEqual([1, 2]);
  });
});

describe("bestDeal", () => {
  it("picks the cheapest priced item", () => {
    expect(
      bestDeal([
        { title: "Wings", priceCents: 1600 },
        { title: "Draught", priceCents: 500 },
        { title: "Trivia", priceCents: null },
      ])
    ).toBe("Draught $5");
  });

  it("falls back to the first title when nothing has a price", () => {
    expect(bestDeal([{ title: "Half-price wine", priceCents: null }])).toBe("Half-price wine");
  });

  it("returns null for no items", () => {
    expect(bestDeal([])).toBeNull();
  });
});
