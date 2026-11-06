import { describe, it, expect, vi } from "vitest";

// The scraper imports the database; only its pure helpers are tested here.
vi.mock("@/db", () => ({ db: {}, events: {}, venues: {} }));
vi.mock("./fetch", () => ({ isAllowedByRobots: vi.fn() }));
vi.mock("./rateLimit", () => ({ rateLimit: vi.fn() }));

import { isPerformanceHall, cleanTitle, localDateTime, eventTypeFor, isUsable, describe as describeEvent, type ShowpassEvent } from "./scrapeShowpass";

const base: ShowpassEvent = {
  id: 1,
  name: "Sienna Spiro - Vogue Theatre - BC",
  local_starts_on: "2026-11-05T20:00:00-07:00",
  is_published: true,
  status: "sp_event_active",
  sold_out: false,
  frontend_details_url: "https://www.showpass.com/x/",
  location: { name: "Vogue Theatre - BC", street_name: "918 Granville St", city: "Vancouver", province: "British Columbia" },
};

describe("isPerformanceHall", () => {
  it("accepts theatres, arts centres, auditoriums and concert halls", () => {
    for (const n of ["Vogue Theatre - BC", "Centennial Theatre", "Raven's Cry Theatre", "Maury Young Arts Centre", "Red Deer Memorial Centre", "Festival Place", "Alix Goolden Performance Hall", "Bert Church Theatre", "Douglas J. Cardinal Performing Arts Centre", "Chandos Pattison Auditorium"]) {
      expect(isPerformanceHall(n), n).toBe(true);
    }
  });
  it("leaves bars, markets, arenas and cinemas to other sources", () => {
    for (const n of ["Unicorn Lounge", "Vancouver Christmas Market", "Kopar Memorial Arena", "Cineplex Cinemas Orange", "Landmark Movie Theatre", "", null, undefined]) {
      expect(isPerformanceHall(n as string | null | undefined), String(n)).toBe(false);
    }
  });
});

describe("cleanTitle", () => {
  it("drops a trailing hall name and province", () => {
    expect(cleanTitle("Sienna Spiro - Vogue Theatre - BC", "Vogue Theatre - BC")).toBe("Sienna Spiro");
    expect(cleanTitle("Comedy Night - Centennial Theatre", "Centennial Theatre")).toBe("Comedy Night");
    expect(cleanTitle("Winter Showcase - AB", "Festival Place")).toBe("Winter Showcase");
  });
  it("leaves a title that does not end with the hall", () => {
    expect(cleanTitle("The Nutcracker at Centennial Theatre Gala", "Centennial Theatre")).toBe("The Nutcracker at Centennial Theatre Gala");
  });
});

describe("localDateTime", () => {
  it("reads the venue's own date and time", () => {
    expect(localDateTime("2026-11-05T20:00:00-07:00")).toEqual({ date: "2026-11-05", time: "20:00" });
    expect(localDateTime(null)).toBeNull();
  });
});

describe("eventTypeFor", () => {
  it("calls concerts live music and the rest other", () => {
    expect(eventTypeFor("Okanagan Symphony Orchestra: Season Opener")).toBe("live_music");
    expect(eventTypeFor("Karaoke Night")).toBe("karaoke");
    expect(eventTypeFor("The Nutcracker")).toBe("other");
  });
});

describe("isUsable", () => {
  it("keeps an active event at a hall", () => {
    expect(isUsable(base)).toBe(true);
  });
  it("drops cancelled, unpublished, recurring-parent and non-hall events", () => {
    expect(isUsable({ ...base, status: "sp_event_cancelled" })).toBe(false);
    expect(isUsable({ ...base, is_published: false })).toBe(false);
    expect(isUsable({ ...base, is_recurring_parent: true })).toBe(false);
    expect(isUsable({ ...base, location: { ...base.location!, name: "Unicorn Lounge" } })).toBe(false);
    expect(isUsable({ ...base, local_starts_on: null })).toBe(false);
  });
});

describe("describe", () => {
  it("says when an event is sold out", () => {
    expect(describeEvent(base)).toBe("Ticketed event, tickets on Showpass.");
    expect(describeEvent({ ...base, sold_out: true })).toBe("Ticketed event, sold out on Showpass.");
  });
});
