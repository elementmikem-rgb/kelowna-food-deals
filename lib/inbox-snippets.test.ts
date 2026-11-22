import { describe, it, expect } from "vitest";
import { SNIPPETS, fillSnippet, snippetsFor, ownerLoginUrl, claimUrl } from "./inbox-snippets";

describe("SNIPPETS", () => {
  it("has at least 12 snippets (6 EN + 6 FR pairs)", () => {
    expect(SNIPPETS.length).toBeGreaterThanOrEqual(12);
  });

  it("has at least 6 EN snippets", () => {
    expect(snippetsFor("en").length).toBeGreaterThanOrEqual(6);
  });

  it("has at least 6 FR snippets", () => {
    expect(snippetsFor("fr").length).toBeGreaterThanOrEqual(6);
  });

  it("snippetsFor returns only the requested language", () => {
    const en = snippetsFor("en");
    const fr = snippetsFor("fr");
    expect(en.every((s) => s.lang === "en")).toBe(true);
    expect(fr.every((s) => s.lang === "fr")).toBe(true);
  });

  it("all snippets have non-empty id, label, and body", () => {
    for (const s of SNIPPETS) {
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });

  it("all snippet ids are unique", () => {
    const ids = SNIPPETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no snippet body contains an em dash", () => {
    for (const s of SNIPPETS) {
      // U+2014 is the em dash character
      expect(s.body).not.toContain("—");
    }
  });

  it("no snippet body contains an emoji", () => {
    // Covers common emoji ranges
    const emojiRe = /[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    for (const s of SNIPPETS) {
      expect(emojiRe.test(s.body)).toBe(false);
    }
  });

  it("all snippet bodies are signed Mike", () => {
    for (const s of SNIPPETS) {
      expect(s.body).toContain("Mike");
    }
  });

  it("FR snippets use vous (formal register)", () => {
    const fr = snippetsFor("fr");
    for (const s of fr) {
      // Every FR snippet should use vous or the body is too short to require it
      const hasVous = s.body.toLowerCase().includes("vous");
      const hasShortBody = s.body.length < 60;
      expect(hasVous || hasShortBody).toBe(true);
    }
  });
});

describe("fillSnippet", () => {
  const enBody = "Hi {{name}},\n\nThanks for adding {{venue}}. See it at {{link}}.\n\nMike";
  const frBody = "Bonjour {{name}},\n\nMerci pour {{venue}}.\n\nMike";

  it("replaces all known variables when provided", () => {
    const result = fillSnippet(enBody, { name: "John", venue: "Bar X", link: "https://example.com" });
    expect(result).toContain("Hi John,");
    expect(result).toContain("Bar X");
    expect(result).toContain("https://example.com");
    expect(result).not.toContain("{{name}}");
    expect(result).not.toContain("{{venue}}");
    expect(result).not.toContain("{{link}}");
  });

  it("fixes Hi , to Hi, when name is not provided", () => {
    const result = fillSnippet(enBody, { venue: "Bar X" });
    expect(result).toMatch(/^Hi,/);
    expect(result).not.toContain("Hi ,");
  });

  it("fixes Bonjour , to Bonjour, when name is not provided", () => {
    const result = fillSnippet(frBody, { venue: "Bar X" });
    expect(result).toMatch(/^Bonjour,/);
    expect(result).not.toContain("Bonjour ,");
  });

  it("does not apply greeting fix when name is provided", () => {
    const result = fillSnippet(enBody, { name: "Alice" });
    expect(result).toContain("Hi Alice,");
    expect(result).not.toMatch(/^Hi,/);
  });

  it("does not apply greeting fix when name is a non-empty string", () => {
    const result = fillSnippet(frBody, { name: "Marie" });
    expect(result).toContain("Bonjour Marie,");
    expect(result).not.toMatch(/^Bonjour,/);
  });

  it("leaves unknown variables untouched", () => {
    const body = "Hi {{name}}, your {{city}} listing is live. Mike";
    const result = fillSnippet(body, { name: "John" });
    expect(result).toContain("{{city}}");
    expect(result).toContain("John");
  });

  it("replaces {{link}} with provided value", () => {
    const result = fillSnippet(enBody, { name: "John", link: "https://test.com" });
    expect(result).toContain("https://test.com");
    expect(result).not.toContain("{{link}}");
  });

  it("replaces multiple occurrences of the same variable", () => {
    const body = "Hi {{name}}, I added {{venue}} -- check {{venue}} at the link. Mike";
    const result = fillSnippet(body, { name: "Sue", venue: "The Pub" });
    expect(result.split("The Pub").length - 1).toBe(2);
  });
});

describe("poster upsell snippets (owners only)", () => {
  const upsell = SNIPPETS.filter((s) => s.id.includes("poster"));

  it("has one English and one French version, both marked claimed-only", () => {
    expect(upsell.map((s) => s.lang).sort()).toEqual(["en", "fr"]);
    expect(upsell.every((s) => s.claimedOnly === true)).toBe(true);
  });

  it("is hidden for a venue that has not claimed its listing", () => {
    expect(snippetsFor("en").some((s) => s.id.includes("poster"))).toBe(false);
    expect(snippetsFor("en", { claimed: false }).some((s) => s.id.includes("poster"))).toBe(false);
  });

  it("is offered for a claimed venue", () => {
    expect(snippetsFor("en", { claimed: true }).some((s) => s.id.includes("poster"))).toBe(true);
    expect(snippetsFor("fr", { claimed: true }).some((s) => s.id.includes("poster"))).toBe(true);
  });

  it("only promises what was verified: the poster shows while the Boost runs, and Boosts are reviewed first", () => {
    const en = upsell.find((s) => s.lang === "en")!.body;
    expect(en).toMatch(/while the boost (is running|runs)/i);
    expect(en).toMatch(/review/i);
  });

  it("quotes no price and makes no reach or results claim", () => {
    for (const s of upsell) {
      expect(s.body).not.toMatch(/\$\s?\d/);
      expect(s.body).not.toMatch(/\d\s?\$/);
      expect(s.body).not.toMatch(/views|more customers|guarantee|clients|visibility boost/i);
    }
  });

  it("uses the owner login link variable and fills it", () => {
    for (const s of upsell) expect(s.body).toContain("{{owner_link}}");
    const filled = fillSnippet(upsell[0].body, { name: "Ana", venue: "Pub X", ownerLink: "https://todaystab.com/owner/login" });
    expect(filled).toContain("https://todaystab.com/owner/login");
    expect(filled).not.toContain("{{");
  });
});

describe("ownerLoginUrl", () => {
  it("builds the owner login link from the venue page address", () => {
    expect(ownerLoginUrl("https://todaystab.com/kelowna/venues/553")).toBe("https://todaystab.com/owner/login");
  });
  it("returns null when there is no usable address", () => {
    expect(ownerLoginUrl(null)).toBeNull();
    expect(ownerLoginUrl("not a url")).toBeNull();
  });
});

describe("claim offer snippets (unclaimed venues only)", () => {
  const offer = SNIPPETS.filter((s) => s.id.includes("claim-offer"));

  it("has one English and one French version, both marked unclaimed-only", () => {
    expect(offer.map((s) => s.lang).sort()).toEqual(["en", "fr"]);
    expect(offer.every((s) => s.unclaimedOnly === true)).toBe(true);
  });

  it("is shown only when the venue is known to be unclaimed", () => {
    expect(snippetsFor("en").some((s) => s.id.includes("claim-offer"))).toBe(false);
    expect(snippetsFor("en", { claimed: true }).some((s) => s.id.includes("claim-offer"))).toBe(false);
    expect(snippetsFor("en", { claimed: false }).some((s) => s.id.includes("claim-offer"))).toBe(true);
    expect(snippetsFor("fr", { claimed: false }).some((s) => s.id.includes("claim-offer"))).toBe(true);
  });

  it("promises only what the claim page says: free, a verified claim, editing, $10 credit, no card", () => {
    const en = offer.find((s) => s.lang === "en")!.body;
    expect(en).toMatch(/free/i);
    expect(en).toMatch(/verify/i);
    expect(en).toMatch(/edit/i);
    expect(en).toContain("$10");
    expect(en).toMatch(/no card/i);
    const fr = offer.find((s) => s.lang === "fr")!.body;
    expect(fr).toContain("10 $");
    expect(fr).toMatch(/aucune carte/i);
  });

  it("uses the claim link variable and fills it", () => {
    for (const s of offer) expect(s.body).toContain("{{claim_link}}");
    const filled = fillSnippet(offer[0].body, { name: "Ana", venue: "Pub X", link: "https://todaystab.com/kelowna/venues/9", claimLink: "https://todaystab.com/kelowna/venues/9/claim" });
    expect(filled).toContain("https://todaystab.com/kelowna/venues/9/claim");
    expect(filled).not.toContain("{{");
  });

  it("makes no results or reach claims", () => {
    for (const s of offer) expect(s.body).not.toMatch(/views|more customers|guarantee|clients/i);
  });
});

describe("claimUrl", () => {
  it("adds /claim to the venue page address", () => {
    expect(claimUrl("https://todaystab.com/kelowna/venues/553")).toBe("https://todaystab.com/kelowna/venues/553/claim");
    expect(claimUrl("https://todaystab.com/kelowna/venues/553/")).toBe("https://todaystab.com/kelowna/venues/553/claim");
  });
  it("is null with no usable address", () => {
    expect(claimUrl(null)).toBeNull();
    expect(claimUrl("not a url")).toBeNull();
  });
});

describe("gentle follow-up snippet", () => {
  it("exists in English and French for any venue, with no price, claim or promotion", () => {
    const nudge = SNIPPETS.filter((s) => s.id.endsWith("-nudge"));
    expect(nudge.map((s) => s.lang).sort()).toEqual(["en", "fr"]);
    for (const s of nudge) {
      expect(s.claimedOnly).toBeUndefined();
      expect(s.unclaimedOnly).toBeUndefined();
      expect(s.body).not.toMatch(/\$|claim|boost|réclam/i);
    }
  });
});
