import { describe, it, expect } from "vitest";
import { pickReplyAddress } from "./reply-address";

describe("pickReplyAddress (who a reply is addressed to)", () => {
  it("replies to whoever wrote last, even when the venue has a different address on file", () => {
    expect(pickReplyAddress({ lastInboundEmail: "sadie@commonwealthbar.ca", venueContactEmail: "info@commonwealthbar.ca" })).toEqual({
      to: "sadie@commonwealthbar.ca",
      differsFromFile: true,
    });
  });

  it("is the same address when they match, ignoring case and spaces", () => {
    expect(pickReplyAddress({ lastInboundEmail: " Info@PubX.ca ", venueContactEmail: "info@pubx.ca" })).toEqual({
      to: "info@pubx.ca",
      differsFromFile: false,
    });
  });

  it("falls back to the address on file when nobody has written yet", () => {
    expect(pickReplyAddress({ lastInboundEmail: null, venueContactEmail: "info@pubx.ca" })).toEqual({
      to: "info@pubx.ca",
      differsFromFile: false,
    });
  });

  it("falls back to the address on file when the sender is a no-reply or system address", () => {
    for (const bad of ["noreply@x.com", "no-reply@x.com", "donotreply@x.com", "do-not-reply@x.com", "mailer-daemon@x.com", "postmaster@x.com"]) {
      expect(pickReplyAddress({ lastInboundEmail: bad, venueContactEmail: "info@pubx.ca" }).to).toBe("info@pubx.ca");
    }
  });

  it("ignores something that is not an email address", () => {
    expect(pickReplyAddress({ lastInboundEmail: "not an email", venueContactEmail: "info@pubx.ca" }).to).toBe("info@pubx.ca");
  });

  it("is null when there is no address at all", () => {
    expect(pickReplyAddress({ lastInboundEmail: null, venueContactEmail: null })).toEqual({ to: null, differsFromFile: false });
  });

  it("uses the sender when the venue has no address on file", () => {
    expect(pickReplyAddress({ lastInboundEmail: "a@b.com", venueContactEmail: null })).toEqual({ to: "a@b.com", differsFromFile: false });
  });
});
