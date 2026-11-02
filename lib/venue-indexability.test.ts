import { describe, it, expect } from "vitest";
import { isThinVenuePage } from "./venue-indexability";

describe("isThinVenuePage", () => {
  it("is thin when there are no specials, events or menu items", () => {
    expect(isThinVenuePage({ specials: 0, events: 0, menuItems: 0 })).toBe(true);
  });

  it("is not thin with a special", () => {
    expect(isThinVenuePage({ specials: 1, events: 0, menuItems: 0 })).toBe(false);
  });

  it("is not thin with an event", () => {
    expect(isThinVenuePage({ specials: 0, events: 2, menuItems: 0 })).toBe(false);
  });

  it("is not thin with a menu", () => {
    expect(isThinVenuePage({ specials: 0, events: 0, menuItems: 5 })).toBe(false);
  });
});
