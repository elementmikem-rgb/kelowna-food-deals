import { describe, it, expect } from "vitest";
import { venueActionEvent, VENUE_ACTION_EVENTS } from "./venue-actions";

describe("venueActionEvent", () => {
  it("maps each button on the venue page to its own event name", () => {
    expect(venueActionEvent("directions")).toBe("venue_directions_click");
    expect(venueActionEvent("website")).toBe("venue_website_click");
    expect(venueActionEvent("menu")).toBe("venue_menu_click");
    expect(venueActionEvent("phone")).toBe("venue_phone_click");
    expect(venueActionEvent("reviews")).toBe("venue_reviews_click");
    expect(venueActionEvent("claim")).toBe("venue_claim_click");
  });

  it("returns null for anything not on the list, so markup can never invent event names", () => {
    expect(venueActionEvent("pageview")).toBeNull();
    expect(venueActionEvent("")).toBeNull();
    expect(venueActionEvent(null)).toBeNull();
    expect(venueActionEvent(undefined)).toBeNull();
  });

  it("keeps every event name within the 50 character limit /api/track accepts", () => {
    for (const name of Object.values(VENUE_ACTION_EVENTS)) expect(name.length).toBeLessThanOrEqual(50);
  });
});
