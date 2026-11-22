import { describe, it, expect } from "vitest";
import { detectLanguage } from "./detect-language";

describe("detectLanguage", () => {
  it("returns unknown for empty input", () => {
    expect(detectLanguage("").lang).toBe("unknown");
  });

  it("returns unknown for very short input (under 12 letters)", () => {
    expect(detectLanguage("Oui").lang).toBe("unknown");
    expect(detectLanguage("Hello").lang).toBe("unknown");
    expect(detectLanguage("ok sure yes").lang).toBe("unknown");
  });

  it("detects French in the specified example reply", () => {
    const text =
      "Bonjour Mike, Desole du delais de reponse mais oui nous organisons des evenements et comme promo actuel nous avons tous les samedis soir ailes de poulet a 1$.";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("detects English for a clear English reply", () => {
    const text =
      "Hello Mike, thanks for reaching out. We are happy to have our specials listed with you. We have happy hour every Friday and Saturday from 4 PM to 6 PM.";
    const result = detectLanguage(text);
    expect(result.lang).toBe("en");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("detects French with accented text", () => {
    const text =
      "Bonjour, nous organisons des événements spéciaux tous les samedis. Vous pouvez nous contacter pour plus de détails.";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
  });

  it("ignores quoted lines starting with >", () => {
    // The > lines are English; only the new French content should count
    const text =
      "> Hello thanks for reaching out the and is are you we for\nBonjour merci pour votre message nous vous repondrons bientot avec plus de details pour les evenements.";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
  });

  it("ignores URLs in content", () => {
    const text =
      "Bonjour nous avons un site https://www.example.com/the-and-is-for pour les evenements avec des promotions speciales.";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
  });

  it("ignores email addresses in content", () => {
    // the@and.is looks like an email and should not count as English stopwords
    const text =
      "Bonjour merci pour le message nous organisons des evenements avec vous pour les samedis.";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
  });

  it("ignores text after a line starting with From:", () => {
    const text =
      "Bonjour merci pour votre message nous organisons des evenements.\n\nFrom: mike@example.com\nHello this is english the and is are you we for with that";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
  });

  it("ignores text after a line starting with De :", () => {
    const text =
      "Bonjour merci nous organisons des evenements avec vous pour les promotions speciales.\n\nDe : mike@example.com\nHello the and is are you we for with that this not thanks";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
  });

  it("ignores text after a line of 10+ underscores", () => {
    const text =
      "Bonjour nous organisons des evenements avec vous pour les promotions.\n__________\nHello the and is are you we for with that this not thanks hello";
    const result = detectLanguage(text);
    expect(result.lang).toBe("fr");
  });

  it("confidence is between 0 and 1", () => {
    const cases = [
      "Bonjour nous organisons des evenements avec les samedis et pour vous",
      "Hello thanks for reaching out we are happy to have you with us",
      "",
      "ok",
    ];
    for (const text of cases) {
      const { confidence } = detectLanguage(text);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });
});
