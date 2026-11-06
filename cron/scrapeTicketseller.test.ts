import { describe, it, expect, vi } from "vitest";

// The scraper imports the database; only its pure parsing is tested here.
vi.mock("@/db", () => ({ db: {}, events: {}, venues: {} }));
vi.mock("./fetch", () => ({ isAllowedByRobots: vi.fn() }));
vi.mock("./rateLimit", () => ({ rateLimit: vi.fn() }));

import { parsePerformances, parseEventPage, parseEventLinks, buildDescription } from "./scrapeTicketseller";

// Shape copied from a live event page (Nov 2026): a MusicEvent block and a line per performance.
const PAGE = `<html><body><main>
<h1>Moontricks</h1>
<p>Fri, Nov 6, 2026 At 7:30pm $49 All Seats(Includes fees &amp; surcharges)</p>
<p>Grassroots blues. Wistful soul.</p>
</main>
<script type="application/ld+json">{"@context":"http://schema.org","@type":"MusicEvent","name":"Moontricks","url":"https://www.ticketseller.ca/tickets/event/moontricks-vernon-2026","startDate":"2026-11-06 00:00:00","location":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Vernon","addressRegion":"BC","streetAddress":"3800 33 St"},"name":"Vernon &amp; District Performing Arts Centre"}}</script>
</body></html>`;

describe("parsePerformances", () => {
  it("reads each performance's date and time, and the lowest price", () => {
    const r = parsePerformances("Fri, Nov 6, 2026 At 7:30pm $49 All Seats Sat, Nov 7, 2026 At 2pm $39.50 All Seats Sat, Nov 7, 2026 At 7:30pm $49");
    expect(r.performances).toEqual([
      { date: "2026-11-06", time: "19:30" },
      { date: "2026-11-07", time: "14:00" },
      { date: "2026-11-07", time: "19:30" },
    ]);
    expect(r.priceFromCents).toBe(3950);
  });
  it("handles noon and midnight and a missing price", () => {
    const r = parsePerformances("Sun, Dec 13, 2026 At 12pm  Fri, Jan 1, 2027 At 12:15am");
    expect(r.performances).toEqual([
      { date: "2026-12-13", time: "12:00" },
      { date: "2027-01-01", time: "00:15" },
    ]);
    expect(r.priceFromCents).toBeNull();
  });
  it("ignores other text with dates", () => {
    expect(parsePerformances("Wednesday, November 11 - Closed").performances).toEqual([]);
  });
});

describe("parseEventPage", () => {
  const ev = parseEventPage(PAGE, "https://www.ticketseller.ca/tickets/event/moontricks-vernon-2026")!;
  it("reads title, venue and city from the structured data", () => {
    expect(ev.title).toBe("Moontricks");
    expect(ev.venueName).toBe("Vernon & District Performing Arts Centre");
    expect(ev.city).toBe("Vernon");
    expect(ev.street).toBe("3800 33 St");
  });
  it("maps a music event to live music and reads the show", () => {
    expect(ev.type).toBe("live_music");
    expect(ev.performances).toEqual([{ date: "2026-11-06", time: "19:30" }]);
    expect(ev.priceFromCents).toBe(4900);
    expect(buildDescription(ev)).toBe("Ticketed event, tickets from $49.");
  });
  it("returns null when the page has no performance line", () => {
    expect(parseEventPage("<html><body><main><h1>X</h1></main></body></html>", "u")).toBeNull();
  });
});

describe("parseEventLinks", () => {
  it("collects each event once", () => {
    const html = `<a href="/tickets/event/a-b">A</a><a href="https://www.ticketseller.ca/tickets/event/a-b">again</a><a href="/tickets/event/c">C</a><a href="/tickets/2026/12/01">month</a>`;
    expect(parseEventLinks(html)).toEqual(["https://www.ticketseller.ca/tickets/event/a-b", "https://www.ticketseller.ca/tickets/event/c"]);
  });
});
