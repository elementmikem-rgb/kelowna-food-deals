import { describe, it, expect, vi } from "vitest";

// The scraper imports the database through storeSource; only its pure parsing is tested here.
vi.mock("@/db", () => ({ db: {}, events: {}, venues: {}, regions: {} }));
vi.mock("./fetch", () => ({ openBrowserSession: vi.fn() }));

import { parseTime, parseEvenuePage, EVENUE_HALLS } from "./scrapeEvenue";
import { dateWithYear } from "./storeSource";

// Shape copied from a live eVenue "Upcoming Events" panel (Nov 2026): month, day, [Sold Out], label, title, "Sat ⦁ 7:30pm".
const row = (code: string, title: string, mon: string, day: number, label: string, when: string, sold = false) =>
  `<a data-testid="upcoming-event-row-x" href="#" aria-label="Buy Ticket to ${title} - ${mon} ${day}" data-eventcode="${code}">
     <div><span>${mon}</span><div>${day}</div></div>
     <div>${sold ? "<span>Sold Out</span>" : ""}<span>${label}</span><span><span>${title}</span></span><span>${when}</span></div>
   </a>`;

const PAGE = `<html><body>
${row("A1", "Calendar Girls", "Nov", 13, "2026-2027 Season", "Fri ⦁ 7:30pm")}
${row("B1", "Disney&#39;s Frozen: The Broadway Musical", "Nov", 7, "Yates Centre", "Sat ⦁ 1:00pm", true)}
${row("C1", "Lethbridge Hurricanes vs. Red Deer Rebels", "Nov", 6, "Lethbridge Hurricanes 2026-2027 Season", "Fri ⦁ 7:00pm")}
</body></html>`;

const today = new Date(Date.UTC(2026, 10, 5));
const cits = EVENUE_HALLS[0];
const yates = EVENUE_HALLS[1];

describe("parseTime", () => {
  it("reads a clock time from the row's last line", () => {
    expect(parseTime("Sat ⦁ 7:30pm")).toBe("19:30");
    expect(parseTime("Sun ⦁ 1:00pm")).toBe("13:00");
    expect(parseTime("Fri ⦁ 12pm")).toBe("12:00");
    expect(parseTime("Fri ⦁ 12:15am")).toBe("00:15");
    expect(parseTime("Sat")).toBeNull();
  });
});

describe("dateWithYear", () => {
  it("picks the next date coming up, rolling into next year", () => {
    expect(dateWithYear(11, 13, today)).toBe("2026-11-13");
    expect(dateWithYear(1, 8, today)).toBe("2027-01-08");
    expect(dateWithYear(11, 2, today)).toBe("2026-11-02"); // a few days ago still counts as this year
    expect(dateWithYear(10, 1, today)).toBe("2027-10-01");
  });
});

describe("parseEvenuePage", () => {
  it("reads title, date and time from each row", () => {
    const list = parseEvenuePage(PAGE, cits, today);
    expect(list[0]).toMatchObject({ title: "Calendar Girls", date: "2026-11-13", time: "19:30", soldOut: false });
    expect(list).toHaveLength(3);
  });

  it("keeps only a hall's own rows when the box office is shared, and flags a sold-out show", () => {
    const list = parseEvenuePage(PAGE, yates, today);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "Disney's Frozen: The Broadway Musical", date: "2026-11-07", time: "13:00", soldOut: true });
  });

  it("links to the hall's own box office on evenue.net only", () => {
    expect(parseEvenuePage(PAGE, cits, today)[0].url).toBe("https://kwtickets.evenue.net/list/CITS2");
  });
});
