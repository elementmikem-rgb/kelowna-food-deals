import { describe, it, expect } from "vitest";
import { splitForTranslation, joinTranslated } from "./translate-units";

const roundTrip = (text: string) => {
  const units = splitForTranslation(text);
  return joinTranslated(units, units.map((u) => u.text));
};

describe("splitForTranslation", () => {
  it("normalizes Windows line endings so paragraphs are found (Outlook sends CRLF)", () => {
    const units = splitForTranslation("Nous n'avons aucun happy hours.\r\n\r\nMerci\r\n\r\nEnvoyé de mon appareil Samsung");
    expect(units.filter((u) => u.translate).map((u) => u.text)).toEqual([
      "Nous n'avons aucun happy hours.",
      "Merci",
      "Envoyé de mon appareil Samsung",
    ]);
  });

  it("treats whitespace-only lines as blank lines between paragraphs", () => {
    const units = splitForTranslation("Un\n  \nDeux");
    expect(units.filter((u) => u.translate).map((u) => u.text)).toEqual(["Un", "Deux"]);
  });

  it("keeps short signature lines on their own lines", () => {
    const units = splitForTranslation("Merci\n\nVéronique Labbée\nPub Théâtre Metro\n231, 3e rue Ouest");
    const texts = units.filter((u) => u.translate).map((u) => u.text);
    expect(texts).toContain("Véronique Labbée");
    expect(texts).toContain("Pub Théâtre Metro");
  });

  it("joins a hard-wrapped paragraph of long lines into one unit so sentences translate whole", () => {
    const long1 = "Nous organisons des evenements chaque semaine et comme promo actuel nous avons";
    const long2 = "tous les samedis soir des ailes de poulet a un dollar pour tout le monde.";
    const units = splitForTranslation(`${long1}\n${long2}`);
    expect(units).toHaveLength(1);
    expect(units[0].text).toBe(`${long1} ${long2}`);
  });

  it("does not send urls, emails, phone numbers or bare numbers to the translator", () => {
    const units = splitForTranslation("https://todaystab.com/x\n\nmike@todaystab.com\n\n(819) 860-6646\n\n231");
    expect(units.every((u) => !u.translate)).toBe(true);
  });

  it("round-trips the original layout exactly when nothing is translated", () => {
    const text = "Bonjour,\n\nNous n'avons aucun happy hours.\n\n\nMerci\n\nPub Metro\n231 rue\nSenneterre";
    expect(roundTrip(text)).toBe(text.replace(/\r\n?/g, "\n"));
  });
});

describe("joinTranslated", () => {
  it("puts translations back with the original blank lines and line breaks", () => {
    const text = "Nous n'avons aucun happy hours.\n\nMerci\n\nPub Metro\nSenneterre";
    const units = splitForTranslation(text);
    const out = joinTranslated(units, units.map((u) => (u.translate ? u.text.toUpperCase() : u.text)));
    expect(out).toBe("NOUS N'AVONS AUCUN HAPPY HOURS.\n\nMERCI\n\nPUB METRO\nSENNETERRE");
  });
});

import { glossaryTranslation, isSingleWord, finishSingleWord } from "./translate-units";

describe("glossaryTranslation (greetings and closings the on-device translator gets wrong)", () => {
  it("translates a bare Merci to Thank you", () => {
    expect(glossaryTranslation("Merci")).toBe("Thank you");
    expect(glossaryTranslation("merci")).toBe("Thank you");
  });

  it("keeps trailing punctuation and drops the French space before it", () => {
    expect(glossaryTranslation("Merci !")).toBe("Thank you!");
    expect(glossaryTranslation("Merci.")).toBe("Thank you.");
    expect(glossaryTranslation("Cordialement,")).toBe("Kind regards,");
  });

  it("covers the common greetings", () => {
    expect(glossaryTranslation("Bonjour")).toBe("Hello");
    expect(glossaryTranslation("Salut")).toBe("Hi");
    expect(glossaryTranslation("Bonsoir")).toBe("Good evening");
  });

  it("returns null for anything else so the translator handles it", () => {
    expect(glossaryTranslation("Merci pour votre réponse")).toBeNull();
    expect(glossaryTranslation("Nous n'avons aucun happy hours.")).toBeNull();
  });
});

describe("single word handling", () => {
  it("recognises a single word", () => {
    expect(isSingleWord("Fermé")).toBe(true);
    expect(isSingleWord("  Fermé ")).toBe(true);
    expect(isSingleWord("Merci beaucoup")).toBe(false);
    expect(isSingleWord("Fermé.")).toBe(false);
    expect(isSingleWord("231")).toBe(false);
  });

  it("removes the period we added and restores the original capitalization", () => {
    expect(finishSingleWord("Fermé", "closed.")).toBe("Closed");
    expect(finishSingleWord("fermé", "Closed.")).toBe("closed");
    expect(finishSingleWord("Fermé", "Closed")).toBe("Closed");
  });
});
