import { describe, it, expect } from "vitest";
import { suggestRegion, type GeoRegion } from "./nearby-region";

const kelowna: GeoRegion = { slug: "kelowna", brandName: "Kelowna Food Deals", lat: 49.888, lng: -119.496 };
const penticton: GeoRegion = { slug: "penticton", brandName: "Penticton Food Deals", lat: 49.4991, lng: -119.5937 };
const vancouver: GeoRegion = { slug: "vancouver", brandName: "Vancouver Food Deals", lat: 49.2827, lng: -123.1207 };
const all = [kelowna, penticton, vancouver];

describe("suggestRegion", () => {
  it("offers Kelowna to someone in Kelowna viewing Penticton", () => {
    expect(suggestRegion({ lat: 49.89, lng: -119.49 }, all, "penticton")?.slug).toBe("kelowna");
  });
  it("offers nothing when already in the viewed region", () => {
    expect(suggestRegion({ lat: 49.89, lng: -119.49 }, all, "kelowna")).toBeNull();
  });
  it("does not nag someone near the viewed region's center", () => {
    // about 21 km south of Kelowna's center, still inside the stay radius
    expect(suggestRegion({ lat: 49.7, lng: -119.55 }, all, "kelowna")).toBeNull();
  });
  it("offers nothing when no region is within range", () => {
    expect(suggestRegion({ lat: 60, lng: -100 }, all, "kelowna")).toBeNull();
  });
});
