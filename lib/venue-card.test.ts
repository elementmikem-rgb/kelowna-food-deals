import { describe, it, expect } from "vitest";
import { pickCardDeal, venueNameFontSize, truncateForCard, cityFromBrand } from "./venue-card";

const NOW = new Date("2026-10-30T18:00:00Z");
const fresh = new Date("2026-10-28T18:00:00Z");
const old = new Date("2026-01-01T18:00:00Z");

function sp(over: Partial<Parameters<typeof pickCardDeal>[0][number]> = {}) {
  return {
    title: "Happy Hour",
    priceCents: null as number | null,
    dayOfWeek: null as number | null,
    isMonthly: false,
    lastVerifiedAt: fresh,
    ...over,
  };
}

describe("pickCardDeal", () => {
  it("returns null when there are no specials", () => {
    expect(pickCardDeal([], "en", NOW)).toBeNull();
  });

  it("ignores specials that have not been verified recently", () => {
    expect(pickCardDeal([sp({ lastVerifiedAt: old })], "en", NOW)).toBeNull();
  });

  it("prefers a daily deal over a weekday-only deal", () => {
    const out = pickCardDeal(
      [sp({ title: "Wing Wednesday", dayOfWeek: 3, priceCents: 1000 }), sp({ title: "Daily Pint", priceCents: 700 })],
      "en",
      NOW
    );
    expect(out).toBe("Daily Pint, $7");
  });

  it("prefers a priced deal over an unpriced one on the same schedule", () => {
    const out = pickCardDeal([sp({ title: "Happy Hour" }), sp({ title: "Burger", priceCents: 1299 })], "en", NOW);
    expect(out).toBe("Burger, $12.99");
  });

  it("picks the cheapest when several are priced on the same schedule", () => {
    const out = pickCardDeal([sp({ title: "A", priceCents: 900 }), sp({ title: "B", priceCents: 500 })], "en", NOW);
    expect(out).toBe("B, $5");
  });

  it("does not repeat a price that is already in the title", () => {
    expect(pickCardDeal([sp({ title: "$5 Cans", priceCents: 500 })], "en", NOW)).toBe("$5 Cans");
  });

  it("adds the weekday for a weekday-only deal whose title lacks it", () => {
    expect(pickCardDeal([sp({ title: "Mini Juggs", dayOfWeek: 5, priceCents: 1200 })], "en", NOW)).toBe("Mini Juggs, $12 (Fri)");
  });

  it("does not add the weekday when the title already names it", () => {
    expect(pickCardDeal([sp({ title: "Wing Wednesday", dayOfWeek: 3, priceCents: 1000 })], "en", NOW)).toBe("Wing Wednesday, $10");
  });

  it("uses French weekday abbreviations on French regions", () => {
    expect(pickCardDeal([sp({ title: "Pichet", dayOfWeek: 5, priceCents: 1200 })], "fr", NOW)).toBe("Pichet, $12 (ven.)");
  });

  it("ranks monthly deals last", () => {
    const out = pickCardDeal([sp({ title: "Monthly Feast", isMonthly: true, priceCents: 100 }), sp({ title: "Late Plates", dayOfWeek: 2 })], "en", NOW);
    expect(out).toBe("Late Plates (Tue)");
  });

  it("is stable regardless of input order", () => {
    const a = sp({ title: "A", priceCents: 500 });
    const b = sp({ title: "B", priceCents: 500 });
    expect(pickCardDeal([a, b], "en", NOW)).toBe(pickCardDeal([b, a], "en", NOW));
  });

  it("shortens a long title", () => {
    const long = "x".repeat(80);
    const out = pickCardDeal([sp({ title: long })], "en", NOW)!;
    expect(out.length).toBeLessThanOrEqual(52);
    expect(out.endsWith("...")).toBe(true);
  });
});

describe("truncateForCard", () => {
  it("leaves short text alone", () => {
    expect(truncateForCard("Tonics Pub", 30)).toBe("Tonics Pub");
  });
  it("cuts at the limit with an ellipsis", () => {
    expect(truncateForCard("abcdefghij", 6)).toBe("abc...");
  });
});

describe("venueNameFontSize", () => {
  it("shrinks as the name gets longer", () => {
    expect(venueNameFontSize("Pub")).toBeGreaterThan(venueNameFontSize("A Very Long Restaurant Name Right Here"));
  });
});

describe("cityFromBrand", () => {
  it("strips the English suffix", () => {
    expect(cityFromBrand("Kelowna Food Deals")).toBe("Kelowna");
  });
  it("strips the older French suffix", () => {
    expect(cityFromBrand("Montréal Spéciaux alimentaires")).toBe("Montréal");
  });
  it("strips the Bons Plans suffix used by the Quebec regions", () => {
    expect(cityFromBrand("Granby Bons Plans")).toBe("Granby");
    expect(cityFromBrand("Saint-Jean-sur-Richelieu Bons Plans")).toBe("Saint-Jean-sur-Richelieu");
  });
  it("leaves a name with no known suffix alone", () => {
    expect(cityFromBrand("Okanagan")).toBe("Okanagan");
  });
});
