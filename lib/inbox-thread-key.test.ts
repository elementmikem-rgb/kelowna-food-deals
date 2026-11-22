import { describe, it, expect } from "vitest";
import { parseThreadKey, threadKeyFor } from "./inbox-thread-key";

describe("threadKeyFor", () => {
  it("uses v<venueId> for a venue-matched thread", () => {
    expect(threadKeyFor(42, "owner@venue.com")).toBe("v42");
  });

  it("uses u<encoded email> for an unmatched sender", () => {
    expect(threadKeyFor(null, "owner+tag@venue.com")).toBe("uowner%2Btag%40venue.com");
  });

  it("encodes spaces and non-ASCII characters", () => {
    expect(threadKeyFor(null, "a b@x.com")).toBe("ua%20b%40x.com");
    expect(threadKeyFor(null, "café@exämple.ca")).toBe("ucaf%C3%A9%40ex%C3%A4mple.ca");
  });
});

describe("parseThreadKey", () => {
  it("round-trips unusual and very long emails", () => {
    const emails = [
      "owner@venue.com",
      "a b@x.com",
      "café@exämple.ca",
      "Ünïcødé.名前@例え.jp",
      "weird%25literal@x.com",
      `${"x".repeat(300)}@${"long-domain-".repeat(20)}example.com`,
    ];
    for (const email of emails) {
      expect(parseThreadKey(threadKeyFor(null, email))).toEqual({ type: "email", email });
    }
  });

  it("parses venue keys", () => {
    expect(parseThreadKey("v42")).toEqual({ type: "venue", venueId: 42 });
    expect(parseThreadKey(threadKeyFor(7, "x@y.com"))).toEqual({ type: "venue", venueId: 7 });
  });

  it("rejects non-integer venue keys and unknown prefixes", () => {
    expect(parseThreadKey("v4.5")).toBeNull();
    expect(parseThreadKey("vabc")).toBeNull();
    expect(parseThreadKey("x123")).toBeNull();
    expect(parseThreadKey("")).toBeNull();
  });
});
