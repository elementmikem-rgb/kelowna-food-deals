import { describe, it, expect } from "vitest";
import { rollupAccessibility, accessibleVenueIds, accessibilityEnabled, ACCESS_MIN_YES, ACCESS_MAX_AGE_DAYS, type AccessVote } from "./accessibility";

const NOW = new Date("2026-11-09T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const vote = (token: string, feature: AccessVote["feature"], answer: AccessVote["answer"], age = 1): AccessVote => ({
  token,
  feature,
  answer,
  createdAt: daysAgo(age),
});

describe("rollupAccessibility", () => {
  it("shows nothing for a venue with no votes", () => {
    expect(rollupAccessibility([], NOW).shown).toEqual([]);
  });

  it("needs the minimum number of yes votes before a feature shows", () => {
    const votes = Array.from({ length: ACCESS_MIN_YES - 1 }, (_, i) => vote(`t${i}`, "entrance", "yes"));
    expect(rollupAccessibility(votes, NOW).shown).toEqual([]);
    votes.push(vote("tx", "entrance", "yes"));
    expect(rollupAccessibility(votes, NOW).shown).toEqual([{ feature: "entrance", confirmedBy: ACCESS_MIN_YES }]);
  });

  it("counts one vote per visitor per feature, the latest one winning", () => {
    const votes = [
      vote("a", "entrance", "no", 10),
      vote("a", "entrance", "yes", 2),
      vote("b", "entrance", "yes"),
      vote("c", "entrance", "yes"),
    ];
    expect(rollupAccessibility(votes, NOW).shown).toEqual([{ feature: "entrance", confirmedBy: 3 }]);
  });

  it("does not let one visitor stuff the count", () => {
    const votes = Array.from({ length: 10 }, () => vote("same", "space", "yes"));
    expect(rollupAccessibility(votes, NOW).shown).toEqual([]);
  });

  it("hides a feature when no votes outnumber yes votes, and never shows a negative", () => {
    const votes = [
      ...["a", "b", "c"].map((t) => vote(t, "washroom", "yes")),
      ...["d", "e", "f", "g"].map((t) => vote(t, "washroom", "no")),
    ];
    const out = rollupAccessibility(votes, NOW);
    expect(out.shown).toEqual([]);
    expect(JSON.stringify(out)).not.toMatch(/not accessible|inaccessible/i);
  });

  it("still shows a feature when no votes are fewer than or equal to yes votes", () => {
    const votes = [...["a", "b", "c"].map((t) => vote(t, "washroom", "yes")), vote("d", "washroom", "no")];
    expect(rollupAccessibility(votes, NOW).shown).toEqual([{ feature: "washroom", confirmedBy: 3 }]);
  });

  it("ignores not-sure votes", () => {
    const votes = ["a", "b", "c"].map((t) => vote(t, "space", "unsure"));
    expect(rollupAccessibility(votes, NOW).shown).toEqual([]);
  });

  it("drops votes older than the expiry window", () => {
    const votes = ["a", "b", "c"].map((t) => vote(t, "entrance", "yes", ACCESS_MAX_AGE_DAYS + 1));
    expect(rollupAccessibility(votes, NOW).shown).toEqual([]);
    const fresh = ["a", "b", "c"].map((t) => vote(t, "entrance", "yes", ACCESS_MAX_AGE_DAYS - 1));
    expect(rollupAccessibility(fresh, NOW).shown).toHaveLength(1);
  });

  it("reports the features in a fixed order", () => {
    const votes = (["washroom", "entrance", "space"] as const).flatMap((f) => ["a", "b", "c"].map((t) => vote(t, f, "yes")));
    expect(rollupAccessibility(votes, NOW).shown.map((s) => s.feature)).toEqual(["entrance", "space", "washroom"]);
  });
});

describe("accessibleVenueIds", () => {
  const withVenue = (venueId: number, v: AccessVote) => ({ ...v, venueId });
  const three = (venueId: number, feature: AccessVote["feature"], prefix: string) =>
    ["a", "b", "c"].map((t) => withVenue(venueId, vote(prefix + t, feature, "yes")));

  it("lists each venue that has at least one confirmed feature, once", () => {
    const votes = [...three(1, "entrance", "x"), ...three(1, "washroom", "x"), ...three(2, "space", "y")];
    expect(accessibleVenueIds(votes, NOW).sort()).toEqual([1, 2]);
  });

  it("leaves out venues that have not reached the threshold", () => {
    const votes = [...three(1, "entrance", "x"), withVenue(2, vote("a", "entrance", "yes")), withVenue(2, vote("b", "entrance", "yes"))];
    expect(accessibleVenueIds(votes, NOW)).toEqual([1]);
  });

  it("does not mix votes from different venues", () => {
    const votes = [withVenue(1, vote("a", "entrance", "yes")), withVenue(2, vote("b", "entrance", "yes")), withVenue(3, vote("c", "entrance", "yes"))];
    expect(accessibleVenueIds(votes, NOW)).toEqual([]);
  });

  it("returns nothing for no votes", () => {
    expect(accessibleVenueIds([], NOW)).toEqual([]);
  });
});

describe("accessibilityEnabled", () => {
  it("is on for every region", () => {
    expect(accessibilityEnabled("lethbridge")).toBe(true);
    expect(accessibilityEnabled("kelowna")).toBe(true);
    expect(accessibilityEnabled("revelstoke-golden")).toBe(true);
  });

  it("is off when there is no region", () => {
    expect(accessibilityEnabled("")).toBe(false);
  });
});
