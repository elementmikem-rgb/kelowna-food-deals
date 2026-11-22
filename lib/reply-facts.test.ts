import { describe, it, expect } from "vitest";
import { extractPhones, extractPrices, samePhone, phoneDigits } from "./reply-facts";

describe("extractPhones", () => {
  it("finds a North American number written with brackets", () => {
    expect(extractPhones("Tél : (819) 860-6646")).toEqual(["(819) 860-6646"]);
  });

  it("finds dashed, dotted and spaced numbers and returns each once", () => {
    const text = "Call 873-536-1077 or 873.536.1077 or 873 536 1077 anytime";
    expect(extractPhones(text)).toEqual(["873-536-1077"]);
  });

  it("handles a leading 1 and plus sign", () => {
    expect(extractPhones("+1 (250) 555-0199")).toEqual(["+1 (250) 555-0199"]);
  });

  it("does not treat prices, years, postal codes or street numbers as phone numbers", () => {
    expect(extractPhones("1$ wings, 2026, J0Y 2M0, 231 3e rue Ouest, $14.50")).toEqual([]);
  });

  it("ignores digits inside a long link", () => {
    expect(extractPhones("https://x.com/tr/cl/8195551234/abc")).toEqual([]);
  });

  it("returns an empty list for text without numbers", () => {
    expect(extractPhones("")).toEqual([]);
    expect(extractPhones("Merci")).toEqual([]);
  });
});

describe("phoneDigits and samePhone", () => {
  it("reduces a number to ten digits, dropping a leading country code", () => {
    expect(phoneDigits("+1 (819) 860-6646")).toBe("8198606646");
    expect(phoneDigits("873 536-1077")).toBe("8735361077");
  });

  it("matches the same number written two ways", () => {
    expect(samePhone("(819) 860-6646", "819.860.6646")).toBe(true);
    expect(samePhone("(819) 860-6646", "873 536-1077")).toBe(false);
  });

  it("treats a missing number as not matching", () => {
    expect(samePhone(null, "873 536-1077")).toBe(false);
  });
});

describe("extractPrices", () => {
  it("finds dollar prices in French and English styles", () => {
    expect(extractPrices("ailes de poulet a 1$ et bière 5,50 $, pizza $12.99")).toEqual(["1$", "5,50 $", "$12.99"]);
  });

  it("returns nothing when there is no price", () => {
    expect(extractPrices("Nous n'avons aucun happy hours.")).toEqual([]);
  });
});
