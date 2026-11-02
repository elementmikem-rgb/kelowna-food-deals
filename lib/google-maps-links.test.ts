import { describe, it, expect } from "vitest";
import {
  mapsDirectionsUrl,
  mapsReviewsUrl,
  mapsWriteReviewUrl,
  mapsEmbedUrl,
  mapsPlaceUrl,
  provinceFromAddress,
} from "./google-maps-links";

const venue = { name: "Pepe's Chophouse", address: "40359 Tantalus Rd, Squamish, BC V0N 1T0" };
const PID = "ChIJQUHA7gv5hlQRObN5zOviNNA";

describe("mapsDirectionsUrl", () => {
  it("uses the place id when we have one, so Google opens the exact place", () => {
    expect(mapsDirectionsUrl({ ...venue, googlePlaceId: PID })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Pepe's Chophouse")}&query_place_id=${PID}`,
    );
  });
  it("falls back to the address text with no place id", () => {
    expect(mapsDirectionsUrl({ ...venue, googlePlaceId: null })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`,
    );
  });
});

describe("review links", () => {
  it("opens the exact place's reviews when we have a place id", () => {
    expect(mapsReviewsUrl({ ...venue, googlePlaceId: PID }, "Squamish")).toBe(
      `https://search.google.com/local/reviews?placeid=${PID}`,
    );
  });
  it("falls back to a Google search for reviews", () => {
    expect(mapsReviewsUrl({ ...venue, googlePlaceId: null }, "Squamish")).toBe(
      `https://www.google.com/search?q=${encodeURIComponent("Pepe's Chophouse Squamish reviews")}`,
    );
  });
  it("only offers a write-a-review link when there is a place id", () => {
    expect(mapsWriteReviewUrl(null)).toBeNull();
    expect(mapsWriteReviewUrl(PID)).toBe(`https://search.google.com/local/writereview?placeid=${PID}`);
  });
});

describe("mapsPlaceUrl (for schema.org hasMap)", () => {
  it("is null without a place id and a place URL with one", () => {
    expect(mapsPlaceUrl(null)).toBeNull();
    expect(mapsPlaceUrl(PID)).toBe(`https://www.google.com/maps/place/?q=place_id:${PID}`);
  });
});

describe("mapsEmbedUrl", () => {
  it("uses the keyed Embed API only when both a key and a place id exist", () => {
    expect(mapsEmbedUrl({ address: venue.address, googlePlaceId: PID, embedKey: "K" })).toBe(
      `https://www.google.com/maps/embed/v1/place?key=K&q=place_id:${PID}`,
    );
  });
  it("keeps the existing keyless embed otherwise", () => {
    const legacy = `https://www.google.com/maps?q=${encodeURIComponent(venue.address)}&output=embed`;
    expect(mapsEmbedUrl({ address: venue.address, googlePlaceId: PID, embedKey: undefined })).toBe(legacy);
    expect(mapsEmbedUrl({ address: venue.address, googlePlaceId: null, embedKey: "K" })).toBe(legacy);
  });
});

describe("provinceFromAddress", () => {
  it("reads the province abbreviation from a Canadian address", () => {
    expect(provinceFromAddress("40359 Tantalus Rd, Squamish, BC V0N 1T0")).toBe("BC");
    expect(provinceFromAddress("1550 Lansdowne St W, Peterborough, ON K9J 8B3")).toBe("ON");
    expect(provinceFromAddress("9910 109 St NW, Edmonton, AB T5K 1H5")).toBe("AB");
    expect(provinceFromAddress("2515 Dewdney Avenue, Regina, Saskatchewan, S4R 8R2, Canada")).toBe("SK");
    expect(provinceFromAddress("557 Wellington Rd S, London, ON N6C 4R3, Canada")).toBe("ON");
  });
  it("returns undefined when the province is not in the address", () => {
    expect(provinceFromAddress("Downtown")).toBeUndefined();
    expect(provinceFromAddress("Halton Region, Ontario")).toBe("ON");
  });
});
