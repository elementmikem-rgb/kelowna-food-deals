import { describe, it, expect } from "vitest";
import { findLikelyDuplicate, namesClose, normalizeVenueName, type VenueLite } from "./venue-dedupe";

const v = (id: number, name: string, extra: Partial<VenueLite> = {}): VenueLite => ({
  id,
  name,
  website: null,
  lat: 49.86,
  lng: -119.5506,
  regionId: 1,
  ...extra,
});

describe("namesClose", () => {
  it("treats the spelling variants we actually saw as the same name", () => {
    expect(namesClose("Smash Kitchen & Bar", "Smash Kitchen and Bar")).toBe(true);
    expect(namesClose("Lakesider Brewing Co.", "Lakesider Brewing")).toBe(true);
    expect(namesClose("Barn Hammer Brewing", "Barn Hammer Brewing Company")).toBe(true);
    expect(namesClose("The Botanist", "Botanist")).toBe(true);
    expect(namesClose("Bocado", "Bocado Restaurant")).toBe(true);
    expect(namesClose("Le Théophile", "Le Theophile - Restaurant")).toBe(true);
  });

  it("keeps genuinely different places apart", () => {
    expect(namesClose("Quails' Gate Winery", "Old Vines Restaurant @ Quails' Gate Winery")).toBe(false);
    expect(namesClose("Original Joe's Kelowna", "Original Joe's West Kelowna")).toBe(false);
    expect(namesClose("The Pub", "The Bar")).toBe(false);
  });

  it("normalises & and accents", () => {
    expect(normalizeVenueName("Café & Bar")).toBe(normalizeVenueName("Cafe and Bar"));
  });
});

describe("findLikelyDuplicate", () => {
  const existing = [v(435, "Lakesider Brewing Co.", { website: "https://lakesiderbrewing.com/" })];

  it("flags the same place under a variant name at the same spot", () => {
    const hit = findLikelyDuplicate(
      { name: "Lakesider Brewing", website: "https://lakesiderbrewing.com/", lat: 49.86, lng: -119.5506, regionId: 1 },
      existing
    );
    expect(hit?.venue.id).toBe(435);
    expect(hit?.reason).toBe("same-coordinates");
  });

  it("flags a same-region name match when the candidate has no position", () => {
    const hit = findLikelyDuplicate({ name: "Lakesider Brewing", lat: null, lng: null, regionId: 1 }, existing);
    expect(hit?.reason).toBe("same-name");
  });

  it("does not flag a chain's other location that shares a website", () => {
    const joes = [v(132, "Original Joe's Kelowna", { website: "https://www.originaljoes.ca/", lat: 49.8715, lng: -119.4895 })];
    const hit = findLikelyDuplicate(
      { name: "Original Joe's West Kelowna", website: "https://www.originaljoes.ca/", lat: 49.8393, lng: -119.6127, regionId: 1 },
      joes
    );
    expect(hit).toBeNull();
  });

  it("does not flag the same chain name in a different region far away", () => {
    const tj = [v(39, "Turtle Jack's Kitchen & Bar", { regionId: 1 })];
    const hit = findLikelyDuplicate(
      { name: "Turtle Jack's Kitchen & Bar", lat: 43.65, lng: -79.38, regionId: 2 },
      tj
    );
    expect(hit).toBeNull();
  });

  it("does not flag different businesses in one building", () => {
    const hit = findLikelyDuplicate(
      { name: "Old Vines Restaurant @ Quails' Gate Winery", lat: 49.86, lng: -119.5506, regionId: 1 },
      [v(7122, "Quails' Gate Winery")]
    );
    expect(hit).toBeNull();
  });

  it("ignores an existing venue with no usable position unless the region matches", () => {
    const hit = findLikelyDuplicate(
      { name: "Lakesider Brewing", lat: 49.86, lng: -119.5506, regionId: 2 },
      [v(9, "Lakesider Brewing Co.", { lat: null, lng: null, regionId: 1 })]
    );
    expect(hit).toBeNull();
  });
});
