import { describe, it, expect } from "vitest";
import { renderUnsubscribePage, isFormConfirmation } from "./unsubscribe-page";

describe("renderUnsubscribePage: confirm", () => {
  const html = renderUnsubscribePage({ state: "confirm", brand: "Whistler Food Deals", language: "en", action: "/api/unsubscribe?venueId=5&token=abc" });

  it("asks for a click instead of unsubscribing, with a POST form", () => {
    expect(html).toMatch(/<form[^>]*method="post"/i);
    expect(html).toContain('action="/api/unsubscribe?venueId=5&amp;token=abc"');
    expect(html).toContain('name="confirm"');
    expect(html).toMatch(/Unsubscribe/);
  });

  it("names the right brand", () => {
    expect(html).toContain("Whistler Food Deals");
    expect(html).not.toContain("Kelowna Food Deals");
  });
});

describe("renderUnsubscribePage: French", () => {
  it("uses French wording for a French region", () => {
    const html = renderUnsubscribePage({ state: "confirm", brand: "Montréal Centre Bons Plans", language: "fr", action: "/x" });
    expect(html).toMatch(/Se désabonner/);
    expect(html).toContain('lang="fr"');
    expect(html).not.toMatch(/Unsubscribe/);
  });

  it("confirms in French once done", () => {
    const html = renderUnsubscribePage({ state: "done", brand: "Bons Plans", language: "fr" });
    expect(html).toMatch(/désabonné/i);
    expect(html).not.toMatch(/<form/i);
  });
});

describe("renderUnsubscribePage: done and invalid", () => {
  it("done has no form so a refresh cannot do anything", () => {
    const html = renderUnsubscribePage({ state: "done", brand: "Whistler Food Deals", language: "en" });
    expect(html).not.toMatch(/<form/i);
    expect(html).toMatch(/unsubscribed/i);
  });

  it("invalid explains the link did not work", () => {
    const html = renderUnsubscribePage({ state: "invalid", brand: "X", language: "en" });
    expect(html).toMatch(/not valid|invalid/i);
    expect(html).not.toMatch(/<form/i);
  });
});

describe("renderUnsubscribePage: safety", () => {
  it("escapes the brand and the action so stored text cannot inject markup", () => {
    const html = renderUnsubscribePage({ state: "confirm", brand: '<script>alert(1)</script>"', language: "en", action: '/x" onsubmit="evil()' });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain('onsubmit="evil()');
    expect(html).toContain("&lt;script&gt;");
  });

  it("tells the browser not to index or cache the page", () => {
    const html = renderUnsubscribePage({ state: "confirm", brand: "X", language: "en", action: "/x" });
    expect(html).toMatch(/noindex/);
  });
});

describe("isFormConfirmation", () => {
  it("recognises the button post and not a mail provider's one-click post", () => {
    expect(isFormConfirmation("confirm=1")).toBe(true);
    expect(isFormConfirmation("List-Unsubscribe=One-Click")).toBe(false);
    expect(isFormConfirmation("")).toBe(false);
  });
});
