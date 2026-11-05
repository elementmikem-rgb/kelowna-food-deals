import { describe, it, expect } from "vitest";
import { tagPageSlugs } from "./tag-pages";

const rows = (title: string, n: number) => Array.from({ length: n }, () => ({ title, category: "happy_hour" }));

describe("tagPageSlugs", () => {
  it("lists a page only when the region has at least five matching specials", () => {
    expect(tagPageSlugs([...rows("Draft beer", 5), ...rows("House wine", 4)])).toEqual(["beer-specials", "drink-specials"]);
  });

  it("returns nothing for a region with no drinks", () => {
    expect(tagPageSlugs(rows("Chicken wings", 10))).toEqual([]);
  });

  it("counts wine and cocktails separately but both feed the drinks page", () => {
    expect(tagPageSlugs([...rows("House wine", 5), ...rows("Caesars", 5)])).toEqual([
      "wine-specials",
      "cocktail-specials",
      "drink-specials",
    ]);
  });
});
