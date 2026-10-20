import { describe, it, expect } from "vitest";
import { pickTowns, townSlug } from "./towns";
import { nearestRegions } from "./nearby-regions";

describe("townSlug", () => {
  it("makes a clean url segment", () => {
    expect(townSlug("West Kelowna")).toBe("west-kelowna");
    expect(townSlug("Saint-Jean-sur-Richelieu")).toBe("saint-jean-sur-richelieu");
    expect(townSlug("Ouest-de-l'Île")).toBe("ouest-de-l-ile");
    expect(townSlug("  Lake Country! ")).toBe("lake-country");
  });
});

describe("pickTowns", () => {
  const rows = [
    { city: "Kelowna", venues: 60 },
    { city: "West Kelowna", venues: 9 },
    { city: "west kelowna", venues: 2 },
    { city: "Lake Country", venues: 4 },
    { city: "Peachland", venues: 1 },
    { city: "Monday", venues: 5 },
    { city: null, venues: 12 },
  ];

  it("keeps towns with enough venues, merging spelling variants, biggest first", () => {
    const towns = pickTowns(rows, "kelowna", "Kelowna");
    expect(towns.map((t) => t.slug)).toEqual(["west-kelowna", "lake-country"]);
    expect(towns[0]).toMatchObject({ city: "West Kelowna", venueCount: 11 });
  });

  it("skips the region's own name and any slug that is already a page", () => {
    const slugs = pickTowns(rows, "kelowna", "Kelowna").map((t) => t.slug);
    expect(slugs).not.toContain("kelowna");
    expect(slugs).not.toContain("monday");
  });

  it("skips a town that makes up most of its region (it would copy the region page)", () => {
    const towns = pickTowns([{ city: "Calgary", venues: 41 }, { city: "Beddington", venues: 3 }], "calgary-nw", "Calgary NW");
    expect(towns.map((t) => t.slug)).toEqual(["beddington"]);
  });

  it("skips towns below the minimum", () => {
    expect(pickTowns([{ city: "Peachland", venues: 2 }], "kelowna", "Kelowna")).toEqual([]);
  });
});

describe("nearestRegions", () => {
  const kelowna = { slug: "kelowna", brandName: "Kelowna Food Deals", lat: 49.888, lng: -119.496 };
  const all = [
    kelowna,
    { slug: "penticton", brandName: "Penticton Food Deals", lat: 49.4991, lng: -119.5937 },
    { slug: "vernon", brandName: "Vernon Food Deals", lat: 50.267, lng: -119.272 },
    { slug: "vancouver", brandName: "Vancouver Food Deals", lat: 49.2827, lng: -123.1207 },
    { slug: "nowhere", brandName: "No Coords", lat: null, lng: null },
  ];

  it("lists neighbouring regions nearest first and leaves out far ones and itself", () => {
    expect(nearestRegions(kelowna, all).map((r) => r.slug)).toEqual(["penticton", "vernon"]);
  });

  it("returns nothing when the current region has no coordinates", () => {
    expect(nearestRegions({ slug: "x", lat: null, lng: null }, all)).toEqual([]);
  });
});
