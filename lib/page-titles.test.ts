import { describe, it, expect } from "vitest";
import { areaNameFromBrand, regionHomeTitle, venueTitle } from "./page-titles";

describe("areaNameFromBrand", () => {
  it("strips the English and French brand suffixes", () => {
    expect(areaNameFromBrand("Kelowna Food Deals")).toBe("Kelowna");
    expect(areaNameFromBrand("Sherwood Park Food Deals")).toBe("Sherwood Park");
    expect(areaNameFromBrand("Gaspésie Nord Bons Plans")).toBe("Gaspésie Nord");
  });

  it("leaves a brand with no known suffix untouched", () => {
    expect(areaNameFromBrand("Okanagan Eats")).toBe("Okanagan Eats");
  });
});

describe("regionHomeTitle", () => {
  it("does not repeat 'Food Deals' for English regions", () => {
    const t = regionHomeTitle("Penticton Food Deals", "en");
    expect(t).toBe("Penticton Deals Today -- Happy Hours & Food Specials");
    expect(t.match(/Deals/g)).toHaveLength(1);
  });

  it("uses the whole city name for multi-word regions", () => {
    expect(regionHomeTitle("Sherwood Park Food Deals", "en")).toBe("Sherwood Park Deals Today -- Happy Hours & Food Specials");
  });

  it("leaves French regions on their existing title", () => {
    expect(regionHomeTitle("Laval Bons Plans", "fr")).toBe("Laval Bons Plans -- Food & Drink Deals Today");
  });
});

describe("venueTitle", () => {
  it("promises happy hour and menu only when the venue has specials or menu items", () => {
    expect(venueTitle({ name: "Simbongsa", brandName: "Kelowna Food Deals", language: "en", hasSpecialsOrMenu: true })).toEqual({
      absolute: "Simbongsa Happy Hour & Menu -- Kelowna",
    });
  });

  it("keeps a plain title for a venue with nothing on file", () => {
    expect(venueTitle({ name: "Simbongsa", brandName: "Kelowna Food Deals", language: "en", hasSpecialsOrMenu: false })).toEqual({
      absolute: "Simbongsa -- Kelowna",
    });
  });

  it("uses the full city name for multi-word regions", () => {
    expect(venueTitle({ name: "The Pub", brandName: "Sherwood Park Food Deals", language: "en", hasSpecialsOrMenu: true })).toEqual({
      absolute: "The Pub Happy Hour & Menu -- Sherwood Park",
    });
  });

  it("leaves French venues on the existing region template", () => {
    expect(venueTitle({ name: "Chez Paul", brandName: "Laval Bons Plans", language: "fr", hasSpecialsOrMenu: true })).toBe("Chez Paul");
  });
});
