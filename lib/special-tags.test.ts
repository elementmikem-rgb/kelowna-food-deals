import { describe, it, expect } from "vitest";
import { tagSpecial } from "./special-tags";

const tags = (title: string, category = "other", description: string | null = null) =>
  tagSpecial({ title, category, description });

describe("tagSpecial", () => {
  it("makes wings both food and wings, whatever the label", () => {
    expect(tags("Half Priced Wings", "wing_night")).toEqual(["food", "wings"]);
    expect(tags("Chicken wings", "food_special")).toEqual(["food", "wings"]);
  });

  it("tags beer under Other as a drink and as beer", () => {
    expect(tags("Bud Light Draft")).toEqual(["drink", "beer"]);
    expect(tags("Bottles of Corona")).toEqual(["drink", "beer"]);
    expect(tags("Proper Pint Molson Canadian or Coors Light (20oz)")).toEqual(["drink", "beer"]);
    expect(tags("Jack up your beer to 22oz")).toEqual(["drink", "beer"]);
  });

  it("keeps wine bottles out of beer", () => {
    expect(tags("Half Price Wine Bottles")).toEqual(["drink", "wine"]);
    expect(tags("Bottles of Sparkling")).toEqual(["drink", "wine"]);
    expect(tags("Wine Wednesday")).toEqual(["drink", "wine"]);
  });

  it("treats caesars, margaritas, highballs and shots as cocktails", () => {
    expect(tags("Caesars")).toEqual(["drink", "cocktails"]);
    expect(tags("Spicy Mango Margarita")).toEqual(["drink", "cocktails"]);
    expect(tags("Double Highballs")).toEqual(["drink", "cocktails"]);
    expect(tags("2oz House Shaft")).toEqual(["drink", "cocktails"]);
  });

  it("stacks a food and drink deal", () => {
    expect(tags("Wings and a pint")).toEqual(["food", "drink", "wings", "beer"]);
  });

  it("recognises activities, kids and brunch without calling activities food or drink", () => {
    expect(tags("Late Night Lanes - 50% off bowling")).toEqual(["activity"]);
    expect(tags("All You Can Sing (Mon-Sun 4:30-8pm)")).toEqual(["activity"]);
    expect(tags("Weekday golf special - reverse twilight, 15% off everyone")).toEqual(["activity"]);
    expect(tags("Kids Eat Free")).toEqual(["food", "kids"]);
    expect(tags("Mimosa or Caesar Brunch Special")).toEqual(["food", "drink", "cocktails", "brunch"]);
  });

  it("uses the description only when the title says nothing", () => {
    expect(tags("Tuesday special", "happy_hour", "$2 off pints of draft")).toEqual(["drink", "beer"]);
    expect(tags("9oz House Wines", "happy_hour", "Happy hour food special")).toEqual(["drink", "wine"]);
  });

  it("falls back to the label when the words say nothing", () => {
    expect(tags("Chefs pick", "food_special")).toEqual(["food"]);
    expect(tags("Happy Hour", "happy_hour")).toEqual([]);
  });

  it("covers sodas, shooters by brand, domestic bottles and menu words seen in the live data", () => {
    expect(tags("Same Team Soda", "happy_hour")).toEqual(["drink"]);
    expect(tags("Fireball", "happy_hour")).toEqual(["drink", "cocktails"]);
    expect(tags("Domestic Bottles", "happy_hour")).toEqual(["drink", "beer"]);
    expect(tags("Tater Tots Happy Hour", "happy_hour")).toEqual(["food"]);
    expect(tags("Happier Hours: appies from $5 (late night)", "happy_hour")).toEqual(["food"]);
  });

  it("does not take wings from a description that lists a whole menu", () => {
    expect(tags("Happy Hour Half Priced Eats", "happy_hour", "wings, nachos and sliders")).toEqual(["food"]);
  });

  it("leaves a bare Happy Hour untagged rather than guessing", () => {
    expect(tags("Happy Hour", "happy_hour")).toEqual([]);
  });

  it("understands common French", () => {
    expect(tags("Bière en fût", "other")).toEqual(["drink", "beer"]);
    expect(tags("Spécial shooters", "other")).toEqual(["drink", "cocktails"]);
  });
});
