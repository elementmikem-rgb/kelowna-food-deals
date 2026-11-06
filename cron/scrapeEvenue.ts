import * as cheerio from "cheerio";
import { openBrowserSession } from "./fetch";
import { decodeEntities } from "./eventClassify";
import { safeUrlOnHost } from "@/lib/safe-url";
import { storeHallEvents, dateWithYear, type HallConfig, type HallEvent } from "./storeSource";

// eVenue (*.evenue.net) is the ticketing app behind Centre In The Square in Kitchener and the Yates Memorial
// Centre in Lethbridge (and Ottawa's Meridian Theatres). The page builds itself in the browser, so it is read
// through the headless browser, and its "Upcoming Events" panel lists the next ten shows with a month, a day, a
// title and "Sat ⦁ 7:30pm". Found by hand in Chrome on 2026-11-05 (docs/theatre-sources.md).
const SOURCE_TAG = "source:evenue";
const PAGE_DELAY_MS = 4000;
const ROW = 'a[data-testid^="upcoming-event-row-"]';

interface EvenueHall extends HallConfig {
  url: string;
  // The panel mixes in other groups on the same box office (Lethbridge's arena hockey and a museum); only rows
  // whose label matches are kept.
  labelMustMatch?: RegExp;
}

export const EVENUE_HALLS: EvenueHall[] = [
  {
    url: "https://kwtickets.evenue.net/list/CITS2",
    regionSlug: "kitchener-waterloo-cambridge",
    venueName: "Centre In The Square",
    address: "101 Queen St N, Kitchener",
  },
  {
    url: "https://visitlethbridgearena.evenue.net/list/YT",
    regionSlug: "lethbridge",
    venueName: "Yates Memorial Centre",
    address: "1002 4 Ave S, Lethbridge",
    labelMustMatch: /yates/i,
  },
];

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// "Sat ⦁ 7:30pm" -> "19:30"
export function parseTime(text: string): string | null {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
  if (!m) return null;
  let h = Number(m[1]);
  const pm = m[3].toLowerCase() === "pm";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

export function parseEvenuePage(html: string, hall: EvenueHall, today: Date = new Date()): HallEvent[] {
  const $ = cheerio.load(html);
  const out: HallEvent[] = [];
  $(ROW).each((_, a) => {
    const el = $(a);
    // The row's own words, in order: month, day, [Sold Out], label, title, "Sat ⦁ 7:30pm".
    const leaves = el
      .find("span,div")
      .map((_, n) => ($(n).children().length === 0 ? $(n).text().replace(/\s+/g, " ").trim() : null))
      .get()
      .filter(Boolean) as string[];
    const aria = decodeEntities(el.attr("aria-label") ?? "");
    const m = aria.match(/^Buy Ticket to (.+) - ([A-Za-z]{3}) (\d{1,2})$/);
    if (!m || leaves.length < 4) return;
    const month = MONTHS[m[2].toLowerCase()];
    if (!month) return;
    const label = leaves[leaves.length - 3] ?? "";
    if (hall.labelMustMatch && !hall.labelMustMatch.test(label)) return;
    out.push({
      title: m[1].replace(/\s+/g, " ").trim(),
      date: dateWithYear(month, Number(m[3]), today),
      time: parseTime(leaves[leaves.length - 1] ?? ""),
      soldOut: leaves.some((l) => /^sold out$/i.test(l)),
      url: safeUrlOnHost(hall.url, "evenue.net"),
    });
  });
  return out;
}

const MUSIC = /\b(concert|symphony|orchestra|tribute|live|band|recital|choir|jazz|rock|tour|songbook)\b/i;

export async function scrapeEvenueEvents(): Promise<{ inserted: number }> {
  const session = await openBrowserSession();
  const results = [];
  try {
    for (const hall of EVENUE_HALLS) {
      const r = await session.fetchHtml(hall.url, { waitForSelector: ROW });
      if (!r.ok) {
        console.error(`eVenue fetch failed for ${hall.url}: ${r.error}`);
        return { inserted: 0 }; // a half-read list must not replace the stored one
      }
      const list = parseEvenuePage(r.html, hall);
      console.log(`eVenue: ${hall.venueName} ${list.length} event(s)`);
      results.push({
        hall,
        events: list,
        eventType: (t: string) => (MUSIC.test(t) ? ("live_music" as const) : ("other" as const)),
        describe: (e: HallEvent) => (e.soldOut ? "Ticketed event, sold out." : "Ticketed event, tickets on the venue's box office."),
      });
      await new Promise((r2) => setTimeout(r2, PAGE_DELAY_MS));
    }
  } finally {
    await session.close();
  }
  return storeHallEvents(SOURCE_TAG, results);
}
