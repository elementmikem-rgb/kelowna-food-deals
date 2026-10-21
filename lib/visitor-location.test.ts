import { describe, it, expect } from "vitest";
import { readVisitorLocation, classifyProximity } from "./visitor-location";

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });
const kelowna = { lat: 49.888, lng: -119.496 };

describe("readVisitorLocation", () => {
  it("reads the city, region code and distance to the viewed region", () => {
    const loc = readVisitorLocation(
      headers({ "cf-ipcity": "Penticton", "cf-region-code": "BC", "cf-iplatitude": "49.4991", "cf-iplongitude": "-119.5937" }),
      kelowna
    );
    expect(loc.city).toBe("Penticton");
    expect(loc.region).toBe("BC");
    expect(loc.distanceKm).toBeGreaterThan(35);
    expect(loc.distanceKm).toBeLessThan(50);
  });

  it("decodes an encoded city name", () => {
    expect(readVisitorLocation(headers({ "cf-ipcity": "Montr%C3%A9al" }), kelowna).city).toBe("Montréal");
  });

  it("returns nulls when Cloudflare sends nothing", () => {
    expect(readVisitorLocation(headers({}), kelowna)).toEqual({ city: null, region: null, distanceKm: null });
  });

  it("has no distance without a region center", () => {
    const loc = readVisitorLocation(headers({ "cf-iplatitude": "49.5", "cf-iplongitude": "-119.6" }), null);
    expect(loc.distanceKm).toBeNull();
  });
});

describe("classifyProximity", () => {
  it("buckets distances", () => {
    expect(classifyProximity(5)).toBe("here");
    expect(classifyProximity(40)).toBe("here");
    expect(classifyProximity(41)).toBe("nearby");
    expect(classifyProximity(150)).toBe("nearby");
    expect(classifyProximity(900)).toBe("away");
    expect(classifyProximity(null)).toBe("unknown");
  });
});
