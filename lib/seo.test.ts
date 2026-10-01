import { describe, it, expect } from "vitest";
import { buildSpecialsJsonLd, buildEventsJsonLd } from "./seo";
import type { SpecialWithVenue } from "./data";
import type { EventWithVenue } from "./events-data";

function fakeSpecial(overrides: Partial<SpecialWithVenue> = {}): SpecialWithVenue {
  return {
    id: 1,
    venueId: 1,
    venueName: "Test Venue",
    venueCity: null,
    title: "Wings",
    description: null,
    priceCents: 500,
    dayOfWeek: null,
    isMonthly: false,
    startTime: null,
    endTime: null,
    category: "wing_night",
    lastVerifiedAt: new Date(),
    confidence: 1,
    venueFeaturedUntil: null,
    boostedUntil: null,
    chatBoostedUntil: null,
    venuePartnerSince: null,
    venueClaimedAt: null,
    venueConfirmedAt: null,
    confirmCount: 0,
    lastConfirmedAt: null,
    hasPhoto: false,
    venuePhotoId: null,
    venueLat: null,
    venueLng: null,
    venueApproxCoords: false,
    venueMapPinBoostedUntil: null,
    flashExpiresAt: null,
    flashClaimLimit: null,
    flashClaimCount: 0,
    ...overrides,
  };
}

function fakeEvent(overrides: Partial<EventWithVenue> = {}): EventWithVenue {
  return {
    id: 1,
    venueId: 1,
    venueName: "Test Venue",
    locationAddress: null,
    title: "Trivia Night",
    description: null,
    eventType: "trivia",
    dayOfWeek: null,
    specificDate: null,
    startTime: null,
    endTime: null,
    coverChargeCents: null,
    lastVerifiedAt: new Date(),
    confidence: 1,
    sourceUrl: null,
    venueFeaturedUntil: null,
    venueClaimedAt: null,
    boostedUntil: null,
    chatBoostedUntil: null,
    hasPhoto: false,
    confirmCount: 0,
    lastConfirmedAt: null,
    interestedCount: 0,
    ...overrides,
  };
}

describe("buildSpecialsJsonLd", () => {
  it("uses the passed provinceCode instead of a hardcoded value", () => {
    const jsonLd = buildSpecialsJsonLd([fakeSpecial({ dayOfWeek: null })], "Calgary Food Deals", "America/Edmonton", "AB");
    expect(jsonLd.itemListElement[0]!.item.offeredBy.address.addressRegion).toBe("AB");
  });

  it("falls back to the region name's first word when venueCity is null", () => {
    const jsonLd = buildSpecialsJsonLd([fakeSpecial({ venueCity: null })], "Kelowna Food Deals", "America/Vancouver", "BC");
    expect(jsonLd.itemListElement[0]!.item.offeredBy.address.addressLocality).toBe("Kelowna");
  });
});

describe("buildEventsJsonLd", () => {
  it("uses specificDate directly for a one-off event", () => {
    const jsonLd = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", dayOfWeek: null, startTime: "20:00" })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC"
    );
    expect(jsonLd.itemListElement[0]!.item.startDate).toBe("2026-11-14T20:00:00");
  });

  it("resolves a recurring weekly event to a date within the next 7 days, never past today", () => {
    const now = new Date("2026-10-05T12:00:00-07:00"); // noon Pacific, a fixed instant
    const todayISO = now.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });

    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      const jsonLd = buildEventsJsonLd(
        [fakeEvent({ dayOfWeek, specificDate: null, startTime: null })],
        "Kelowna Food Deals",
        "America/Vancouver",
        "BC",
        now
      );
      const resolvedDate = jsonLd.itemListElement[0]!.item.startDate as string;
      expect(resolvedDate >= todayISO).toBe(true);
      // Within 6 days out (a weekly cadence never needs to reach for next week's
      // instance of the same weekday it could resolve to this week).
      const daysOut = (new Date(resolvedDate).getTime() - new Date(todayISO).getTime()) / (24 * 60 * 60 * 1000);
      expect(daysOut).toBeGreaterThanOrEqual(0);
      expect(daysOut).toBeLessThanOrEqual(6);
    }
  });

  it("includes an Offer only when a cover charge is set", () => {
    const withCover = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", coverChargeCents: 1000 })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC"
    );
    expect(withCover.itemListElement[0]!.item.offers).toEqual({
      "@type": "Offer",
      price: "10.00",
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
    });

    const withoutCover = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", coverChargeCents: null })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC"
    );
    expect(withoutCover.itemListElement[0]!.item.offers).toBeUndefined();
  });

  it("uses the passed provinceCode in the event location address", () => {
    const jsonLd = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14" })],
      "Calgary Food Deals",
      "America/Edmonton",
      "AB"
    );
    expect(jsonLd.itemListElement[0]!.item.location.address.addressRegion).toBe("AB");
  });
});
