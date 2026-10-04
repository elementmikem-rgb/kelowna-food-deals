import { describe, it, expect } from "vitest";
import { buildSpecialsJsonLd, buildEventsJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd, buildWebsiteJsonLd } from "./seo";
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
      [fakeEvent({ specificDate: "2026-11-14", dayOfWeek: null, startTime: "20:00:00" })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    // events.startTime is a Postgres `time` column -- Drizzle returns "HH:MM:SS",
    // never "HH:MM" -- so the fixture above matches real data, not the old buggy
    // ":00"-appending code this test caught (startDate was coming out
    // "20:00:00:00", invalid ISO 8601).
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
        "kelowna",
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

  it("always includes an Offer, free (price 0) when no cover charge is set", () => {
    const withCover = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", coverChargeCents: 1000, lastVerifiedAt: new Date("2026-10-01T00:00:00Z") })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    expect(withCover.itemListElement[0]!.item.offers).toEqual({
      "@type": "Offer",
      price: "10.00",
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
      url: "https://todaystab.com/kelowna/events",
      validFrom: "2026-10-01T00:00:00.000Z",
    });

    const withoutCover = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", coverChargeCents: null })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    expect(withoutCover.itemListElement[0]!.item.offers).toMatchObject({ price: "0", priceCurrency: "CAD" });
  });

  it("includes endDate only when an endTime is on file, never fabricated", () => {
    const withEnd = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", startTime: "20:00:00", endTime: "23:00:00" })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    expect(withEnd.itemListElement[0]!.item.endDate).toBe("2026-11-14T23:00:00");

    const withoutEnd = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", startTime: "20:00:00", endTime: null })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    expect(withoutEnd.itemListElement[0]!.item.endDate).toBeUndefined();
  });

  it("sets organizer to the venue, with a venue page URL when venueId is known", () => {
    const jsonLd = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", venueId: 42, venueName: "The Keg" })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    expect(jsonLd.itemListElement[0]!.item.organizer).toEqual({
      "@type": "Organization",
      name: "The Keg",
      url: "https://todaystab.com/kelowna/venues/42",
    });
  });

  it("includes image only when the event has its own photo on file", () => {
    const withPhoto = buildEventsJsonLd(
      [fakeEvent({ id: 7, specificDate: "2026-11-14", hasPhoto: true })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    expect(withPhoto.itemListElement[0]!.item.image).toBe("https://todaystab.com/api/events/7/photo");

    const withoutPhoto = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", hasPhoto: false })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    expect(withoutPhoto.itemListElement[0]!.item.image).toBeUndefined();
  });

  it("never double-appends seconds onto a Postgres time-column value (regression: startDate used to come out '...T20:00:00:00')", () => {
    const jsonLd = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14", startTime: "20:00:00" })],
      "Kelowna Food Deals",
      "America/Vancouver",
      "BC",
      "kelowna"
    );
    const startDate = jsonLd.itemListElement[0]!.item.startDate as string;
    expect(startDate).toBe("2026-11-14T20:00:00");
    expect(() => new Date(startDate).toISOString()).not.toThrow();
    expect(Number.isNaN(new Date(startDate).getTime())).toBe(false);
  });

  it("uses the passed provinceCode in the event location address", () => {
    const jsonLd = buildEventsJsonLd(
      [fakeEvent({ specificDate: "2026-11-14" })],
      "Calgary Food Deals",
      "America/Edmonton",
      "AB",
      "calgary"
    );
    expect(jsonLd.itemListElement[0]!.item.location.address.addressRegion).toBe("AB");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("builds an ordered ListItem per crumb with absolute URLs", () => {
    const jsonLd = buildBreadcrumbJsonLd("https://todaystab.com", [
      { name: "Home", path: "/" },
      { name: "Kelowna Food Deals", path: "/kelowna" },
      { name: "Wing Night", path: "/kelowna/wing-night" },
    ]);
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(3);
    expect(jsonLd.itemListElement[0]).toEqual({ "@type": "ListItem", position: 1, name: "Home", item: "https://todaystab.com/" });
    expect(jsonLd.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Wing Night",
      item: "https://todaystab.com/kelowna/wing-night",
    });
  });
});

describe("buildFaqJsonLd", () => {
  it("builds a Question/Answer pair per item, preserving order", () => {
    const jsonLd = buildFaqJsonLd([
      { q: "How often are specials checked?", a: "Regularly." },
      { q: "Is this free?", a: "Yes." },
    ]);
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toEqual([
      { "@type": "Question", name: "How often are specials checked?", acceptedAnswer: { "@type": "Answer", text: "Regularly." } },
      { "@type": "Question", name: "Is this free?", acceptedAnswer: { "@type": "Answer", text: "Yes." } },
    ]);
  });
});

describe("buildWebsiteJsonLd", () => {
  it("links the WebSite and Organization nodes to each other by @id", () => {
    const jsonLd = buildWebsiteJsonLd("https://todaystab.com/kelowna", "Kelowna Food Deals", "https://todaystab.com/icons/icon-192.png");
    const [website, org] = jsonLd["@graph"];
    expect(website).toEqual({
      "@type": "WebSite",
      "@id": "https://todaystab.com/kelowna/#website",
      url: "https://todaystab.com/kelowna",
      name: "Kelowna Food Deals",
      publisher: { "@id": "https://todaystab.com/kelowna/#organization" },
    });
    expect(org).toEqual({
      "@type": "Organization",
      "@id": "https://todaystab.com/kelowna/#organization",
      name: "Kelowna Food Deals",
      url: "https://todaystab.com/kelowna",
      logo: "https://todaystab.com/icons/icon-192.png",
    });
  });
});
