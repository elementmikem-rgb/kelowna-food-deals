import { describe, it, expect } from "vitest";
import { inboundArchivedAt, replyAttribution, shouldLookUpVenueByInReplyTo } from "./inbound-reply";

describe("shouldLookUpVenueByInReplyTo", () => {
  it("looks up the original send only when the sender matched no venue and In-Reply-To is present", () => {
    expect(shouldLookUpVenueByInReplyTo(null, "<abc@smtp-relay.mailin.fr>")).toBe(true);
    expect(shouldLookUpVenueByInReplyTo(12, "<abc@smtp-relay.mailin.fr>")).toBe(false);
    expect(shouldLookUpVenueByInReplyTo(null, null)).toBe(false);
    expect(shouldLookUpVenueByInReplyTo(null, "")).toBe(false);
  });
});

describe("replyAttribution", () => {
  it("prefers the exact In-Reply-To send", () => {
    expect(replyAttribution({ blocked: false, kind: "reply", inReplyTo: "<m1>", venueId: 5 })).toEqual({
      mode: "in_reply_to",
      inReplyTo: "<m1>",
    });
  });

  it("falls back to the venue's latest sent row without In-Reply-To", () => {
    expect(replyAttribution({ blocked: false, kind: "reply", inReplyTo: null, venueId: 5 })).toEqual({
      mode: "latest_sent",
      venueId: 5,
    });
  });

  it("does nothing with neither In-Reply-To nor a venue", () => {
    expect(replyAttribution({ blocked: false, kind: "reply", inReplyTo: null, venueId: null })).toEqual({ mode: "none" });
  });

  it("never counts a blocked sender as a reply", () => {
    expect(replyAttribution({ blocked: true, kind: "reply", inReplyTo: "<m1>", venueId: 5 })).toEqual({ mode: "none" });
    expect(replyAttribution({ blocked: true, kind: "reply", inReplyTo: null, venueId: 5 })).toEqual({ mode: "none" });
  });

  it("never counts an auto reply or bounce notice as a reply", () => {
    expect(replyAttribution({ blocked: false, kind: "auto_reply", inReplyTo: "<m1>", venueId: 5 })).toEqual({
      mode: "none",
    });
    expect(replyAttribution({ blocked: false, kind: "bounce_notice", inReplyTo: null, venueId: 5 })).toEqual({
      mode: "none",
    });
  });
});

describe("inboundArchivedAt", () => {
  const now = new Date("2026-11-22T12:00:00Z");

  it("leaves a real reply from an unblocked sender in the inbox", () => {
    expect(inboundArchivedAt({ blocked: false, kind: "reply" }, now)).toBeNull();
  });

  it("archives a blocked sender's message", () => {
    expect(inboundArchivedAt({ blocked: true, kind: "reply" }, now)).toBe(now);
  });

  it("archives auto replies and bounce notices", () => {
    expect(inboundArchivedAt({ blocked: false, kind: "auto_reply" }, now)).toBe(now);
    expect(inboundArchivedAt({ blocked: false, kind: "bounce_notice" }, now)).toBe(now);
  });
});
