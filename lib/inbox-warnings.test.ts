import { describe, it, expect } from "vitest";
import { unfamiliarLinkDomains, senderMismatch } from "./inbox-warnings";

describe("unfamiliarLinkDomains", () => {
  it("returns sites that are neither the venue's own nor well known", () => {
    expect(unfamiliarLinkDomains("See https://cheap-deals-now.biz/x and http://www.sketchy.example/a", "https://pubx.ca")).toEqual([
      "cheap-deals-now.biz",
      "sketchy.example",
    ]);
  });
  it("ignores the venue's own site, including www and subdomains", () => {
    expect(unfamiliarLinkDomains("Menu: https://www.pubx.ca/menu and https://order.pubx.ca/", "https://pubx.ca/")).toEqual([]);
  });
  it("ignores well-known social, maps, booking and our own sites", () => {
    const t = "https://www.facebook.com/pubx https://instagram.com/pubx https://maps.google.com/?q=x https://todaystab.com/kelowna https://www.eventbrite.ca/e/1 https://fb.me/x";
    expect(unfamiliarLinkDomains(t, null)).toEqual([]);
  });
  it("ignores mail-system links: Outlook footers and security link rewriters", () => {
    const t = "Get Outlook for iOS<https://aka.ms/o0ukef> https://na01.safelinks.protection.outlook.com/?url=x https://urldefense.proofpoint.com/v2/url?u=x https://linkprotect.cudasvc.com/url?a=x";
    expect(unfamiliarLinkDomains(t, null)).toEqual([]);
  });
  it("ignores things that are not real web addresses, like a phone number after https://", () => {
    expect(unfamiliarLinkDomains("Call https://514-498-2228 or https://localhost/x", null)).toEqual([]);
  });
  it("only looks at the sender's own words, not quoted history", () => {
    expect(unfamiliarLinkDomains("Thanks!\n\nOn Mon, Nov 2, 2026 at 9:30 AM Mike wrote:\n> https://spam.biz/x", null)).toEqual([]);
  });
  it("lists each site once and copes with no links or no text", () => {
    expect(unfamiliarLinkDomains("https://a.biz/1 https://a.biz/2", null)).toEqual(["a.biz"]);
    expect(unfamiliarLinkDomains("No links here", null)).toEqual([]);
    expect(unfamiliarLinkDomains(null, null)).toEqual([]);
  });
  it("trims trailing punctuation from the link", () => {
    expect(unfamiliarLinkDomains("Go to https://deal.biz/page.", null)).toEqual(["deal.biz"]);
  });
});

describe("senderMismatch", () => {
  it("is true when the reply came from a different address than the one on file", () => {
    expect(senderMismatch("owner@gmail.com", "info@pubx.ca")).toBe(true);
  });
  it("ignores case and surrounding space", () => {
    expect(senderMismatch(" Info@PubX.ca ", "info@pubx.ca")).toBe(false);
  });
  it("is false when there is nothing on file or no sender to compare", () => {
    expect(senderMismatch("owner@gmail.com", null)).toBe(false);
    expect(senderMismatch(null, "info@pubx.ca")).toBe(false);
  });
});
