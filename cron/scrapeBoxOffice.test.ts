import { describe, it, expect, vi } from "vitest";

// The scraper imports the database; only its pure parsing functions are tested here.
vi.mock("@/db", () => ({ db: {}, events: {}, venues: {} }));
vi.mock("./fetch", () => ({ openBrowserSession: vi.fn() }));

import {
  parseShowtime,
  parsePriceFromCents,
  tidyTitle,
  eventTypeForCategory,
  parseListingLinks,
  parseEventPage,
  buildDescription,
} from "./scrapeBoxOffice";

// Shape copied from a live event page (Nov 2026): venue block, one div per showtime, price, category tag.
const EVENT_HTML = `
<html><body><article>
  <h1><span class="UnderlineText">THE DINNER THEATRE — WORLD PREMIERE</span></h1>
  <div class="event-description body-collapsed"><p>A new comedy with dinner.</p> <p>Tickets for <b>The Dinner Theatre</b> are non-refundable.</p></div>
  <div class="event-location-details performing-arts">
    <span>Venue Details:</span>
    <div class="locations"><i class="bi"></i><div>The HOV<div><p>228 Valley Rd, Kelowna, BC</p></div></div></div>
    <div class="event-date"><div>
      <div>Thu, Nov 5th 2026 | 7:30 pm</div>
      <div>Fri, Nov 6th 2026 | 7:30 pm</div>
      <div>Sat, Nov 7th 2026 | 2pm</div>
    </div></div>
    <div class="event-price"><div>$44.00 including fees &amp; GST</div></div>
  </div>
  <div class="event-ticket-details"><span>Ticketing Details:</span><a>+1 250-469-8940</a></div>
  <div class="event-footer"><div class="event-tags"><h3>Tags:</h3><div class="d-flex"><div class="category-container"><div class="event-text category"><div>Performing Arts</div></div></div></div></div></div>
</article></body></html>`;

describe("parseShowtime", () => {
  it("reads the date and the time", () => {
    expect(parseShowtime("Thu, Nov 5th 2026 | 7:30 pm")).toEqual({ date: "2026-11-05", time: "19:30" });
    expect(parseShowtime("Sat, Nov 7th 2026 | 2pm")).toEqual({ date: "2026-11-07", time: "14:00" });
    expect(parseShowtime("Sun, Dec 13th 2026 | 12pm")).toEqual({ date: "2026-12-13", time: "12:00" });
    expect(parseShowtime("Fri, Jan 1st 2027 | 12:15 am")).toEqual({ date: "2027-01-01", time: "00:15" });
  });

  it("keeps a date with no time", () => {
    expect(parseShowtime("Sat, Nov 21st 2026")).toEqual({ date: "2026-11-21", time: null });
  });

  it("ignores text that is not a showtime", () => {
    expect(parseShowtime("Prices vary")).toBeNull();
  });
});

describe("parsePriceFromCents", () => {
  it("takes the lowest price of a range", () => {
    expect(parsePriceFromCents("$19.99 - $31.46 including fees & GST")).toBe(1999);
    expect(parsePriceFromCents("$77.11 plus fees & GST")).toBe(7711);
  });
  it("returns null when no price is given", () => {
    expect(parsePriceFromCents("Prices vary")).toBeNull();
  });
});

describe("tidyTitle", () => {
  it("title-cases an all-caps title and keeps small words small", () => {
    expect(tidyTitle("OKANAGAN FIGHT NIGHT 8")).toBe("Okanagan Fight Night 8");
    expect(tidyTitle("THE PASSION OF AMY WINEHOUSE - BACK TO BLACK")).toBe("The Passion of Amy Winehouse - Back to Black");
    expect(tidyTitle("KEN'S KINGS NIGHT")).toBe("Ken's Kings Night");
  });
  it("leaves a mixed-case title alone", () => {
    expect(tidyTitle("UBCO Heat vs UBC Thunderbirds")).toBe("UBCO Heat vs UBC Thunderbirds");
  });
});

describe("eventTypeForCategory", () => {
  it("maps music and sports, and leaves the rest as other", () => {
    expect(eventTypeForCategory("Music")).toBe("live_music");
    expect(eventTypeForCategory("Sports")).toBe("sports_night");
    expect(eventTypeForCategory("Performing Arts")).toBe("other");
    expect(eventTypeForCategory("Film")).toBe("other");
    expect(eventTypeForCategory(null)).toBe("other");
  });
});

describe("parseListingLinks", () => {
  it("collects event links once each and skips pagination and other links", () => {
    const html = `<a href="/upcoming-events/a-b">A</a><a href="/upcoming-events/a-b">again</a>
      <a href="/upcoming-events?page=2">next</a><a href="/upcoming-events/c-d?x=1">tracked</a><a href="/about">about</a>`;
    expect(parseListingLinks(html)).toEqual(["https://www.theboxoffice.ca/upcoming-events/a-b"]);
  });
});

describe("parseEventPage", () => {
  const ev = parseEventPage(EVENT_HTML, "https://www.theboxoffice.ca/upcoming-events/the-dinner-theatre")!;

  it("reads the title, venue and category", () => {
    expect(ev.title).toBe("The Dinner Theatre — World Premiere");
    expect(ev.venueName).toBe("The HOV");
    expect(ev.venueAddress).toBe("228 Valley Rd, Kelowna, BC");
    expect(ev.category).toBe("Performing Arts");
  });

  it("returns one showtime per listed date", () => {
    expect(ev.showtimes).toEqual([
      { date: "2026-11-05", time: "19:30" },
      { date: "2026-11-06", time: "19:30" },
      { date: "2026-11-07", time: "14:00" },
    ]);
  });

  it("reads the ticket price and writes a plain description", () => {
    expect(ev.priceFromCents).toBe(4400);
    expect(buildDescription(ev)).toBe("Performing Arts · ticketed, tickets from $44 with fees.");
    expect(buildDescription({ ...ev, priceFromCents: null, category: null })).toBe("Ticketed event, ticket prices vary.");
  });

  it("returns null for a page with no showtimes", () => {
    expect(parseEventPage("<html><body><article><h1>X</h1></article></body></html>", "u")).toBeNull();
  });
});
