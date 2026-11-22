import { describe, it, expect } from "vitest";
import { SNIPPETS, fillSnippet, snippetsFor } from "./inbox-snippets";

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
