import { describe, it, expect } from "vitest";
import { buildThreadingHeaders } from "./email-threading";

describe("buildThreadingHeaders", () => {
  it("sets In-Reply-To and References to the inbound Message-ID", () => {
    expect(buildThreadingHeaders({ messageId: "<CAF123@mail.gmail.com>", inReplyTo: null })).toEqual({
      "In-Reply-To": "<CAF123@mail.gmail.com>",
      References: "<CAF123@mail.gmail.com>",
    });
  });

  it("adds angle brackets when the stored id has none", () => {
    expect(buildThreadingHeaders({ messageId: "CAF123@mail.gmail.com", inReplyTo: null })).toEqual({
      "In-Reply-To": "<CAF123@mail.gmail.com>",
      References: "<CAF123@mail.gmail.com>",
    });
  });

  it("chains the inbound message's own In-Reply-To into References", () => {
    expect(
      buildThreadingHeaders({ messageId: "<reply@venue.com>", inReplyTo: "<orig@smtp-relay.mailin.fr>" })
    ).toEqual({
      "In-Reply-To": "<reply@venue.com>",
      References: "<orig@smtp-relay.mailin.fr> <reply@venue.com>",
    });
  });

  it("returns undefined when no Message-ID is stored", () => {
    expect(buildThreadingHeaders(null)).toBeUndefined();
    expect(buildThreadingHeaders({ messageId: null, inReplyTo: "<x@y>" })).toBeUndefined();
    expect(buildThreadingHeaders({ messageId: "   ", inReplyTo: null })).toBeUndefined();
  });

  it("drops ids containing line breaks (header injection)", () => {
    expect(buildThreadingHeaders({ messageId: "<a@b>\r\nBcc: x@evil.com", inReplyTo: null })).toBeUndefined();
    expect(buildThreadingHeaders({ messageId: "<a@b>", inReplyTo: "<c@d>\nBcc: x@evil.com" })).toEqual({
      "In-Reply-To": "<a@b>",
      References: "<a@b>",
    });
  });
});
