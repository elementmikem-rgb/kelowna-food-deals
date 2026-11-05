import { describe, it, expect } from "vitest";
import { areaNameFromBrand, dayPageTitle, regionHomeTitle, venueDescription, venueTitle } from "./page-titles";

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

describe("dayPageTitle", () => {
  it("leads with the words people search: area, food deals, the weekday", () => {
    expect(dayPageTitle("Regina", "Friday")).toBe("Regina Food Deals on Friday: Happy Hour & Specials");
    expect(dayPageTitle("Sherwood Park", "Wednesday")).toBe("Sherwood Park Food Deals on Wednesday: Happy Hour & Specials");
  });

  it("does not repeat the brand, since the page title bypasses the site template", () => {
    expect(dayPageTitle("Kelowna", "Monday").match(/Food Deals/g)).toHaveLength(1);
  });
});

describe("venueDescription", () => {
  const base = { name: "Ask Pablo", address: "269 Lawrence Ave, Kelowna, BC", language: "en" };

  it("leads with the real deals, with price and days", () => {
    const d = venueDescription({
      ...base,
      deals: [
        { title: "Power Taps", priceCents: 800, dayLabel: "Fri-Sat" },
        { title: "Double Margs", priceCents: 1000, dayLabel: "Wed" },
      ],
    });
    expect(d).toBe("Ask Pablo, 269 Lawrence Ave, Kelowna, BC: Power Taps $8 (Fri-Sat), Double Margs $10 (Wed). Checked by TodaysTab.");
  });

  it("keeps a deal with no price or day short", () => {
    const d = venueDescription({ ...base, deals: [{ title: "Mariscos Seafood Platter", priceCents: null, dayLabel: null }] });
    expect(d).toContain("Mariscos Seafood Platter.");
  });

  it("lists at most three deals and stays under 160 characters", () => {
    const deals = Array.from({ length: 6 }, (_, i) => ({ title: `Special number ${i + 1} with a long name`, priceCents: 999, dayLabel: "Mon-Fri" }));
    const d = venueDescription({ ...base, deals });
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d).not.toContain("Special number 4");
  });

  it("falls back to the generic line with no deals, and for French regions", () => {
    expect(venueDescription({ ...base, deals: [] })).toBe("Current food/drink specials, events, and info for Ask Pablo -- 269 Lawrence Ave, Kelowna, BC. Verified, not guessed.");
    expect(venueDescription({ ...base, language: "fr", deals: [{ title: "X", priceCents: 500, dayLabel: "Lun" }] })).toBe(
      "Spéciaux repas et boissons, événements et informations pour Ask Pablo -- 269 Lawrence Ave, Kelowna, BC. Vérifiés, pas devinés."
    );
  });
});
