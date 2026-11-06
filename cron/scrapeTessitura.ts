import * as cheerio from "cheerio";
import { openBrowserSession, isAllowedByRobots } from "./fetch";
import { decodeEntities } from "./eventClassify";
import { safeUrlOnHost } from "@/lib/safe-url";
import { storeHallEvents, type HallConfig, type HallEvent } from "./storeSource";

// Tessitura web ticket sites ("/Online/default.asp") build their show list in the browser: each card has the
// show name, a date line ("Saturday, November 7, 2026 8 p.m."), the stage and the series, and the list is spread
// over a few pages whose links carry a session token. Read through the headless browser, following the page links
// the first page offers. Found by hand in Chrome on 2026-11-05 (docs/theatre-sources.md); add a hall by adding its
// list address and region here.
const SOURCE_TAG = "source:tessitura";
const PAGE_DELAY_MS = 4000;
const MAX_PAGES = 6;
const CARD_DATE = ".grid-result .carddate";

interface TessituraHall extends HallConfig {
  url: string;
  hostSuffix: string;
}

export const TESSITURA_HALLS: TessituraHall[] = [
  {
    url: "https://tickets.rhcentre.ca/Online/default.asp",
    hostSuffix: "rhcentre.ca",
    regionSlug: "york-region",
    venueName: "Richmond Hill Centre for the Performing Arts",
    address: "10268 Yonge St, Richmond Hill",
  },
];

const MONTHS: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

// "Wednesday, November 11, 2026 & Thursday, November 12, 2026 8 p.m." -> both dates, one time ("20:00").
// A card with no clock reading still gets its dates.
export function parseCardDate(text: string): { dates: string[]; time: string | null } {
  const clean = text.replace(/\s+/g, " ");
  const dates: string[] = [];
  for (const m of clean.matchAll(/([A-Za-z]+) (\d{1,2}), (\d{4})/g)) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) dates.push(`${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`);
  }
  const t = clean.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i);
  let time: string | null = null;
  if (t) {
    let h = Number(t[1]);
    const pm = t[3].toLowerCase() === "p";
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    time = `${String(h).padStart(2, "0")}:${t[2] ?? "00"}`;
  }
  return { dates, time };
}

export function parseTessituraPage(html: string, hall: TessituraHall): HallEvent[] {
  const $ = cheerio.load(html);
  const out: HallEvent[] = [];
  const url = safeUrlOnHost(hall.url, hall.hostSuffix);
  $(".grid-result").each((_, el) => {
    const card = $(el);
    const title = decodeEntities(card.find(".item-name").text()).replace(/\s+/g, " ").trim();
    const { dates, time } = parseCardDate(card.find(".carddate").text());
    if (!title) return;
    for (const date of dates) out.push({ title, date, time, url });
  });
  return out;
}

// The page links ("2", "3") for the other pages of the list, as absolute addresses. Only https links on the
// hall's own host are kept: a link on the page must never send the browser somewhere else.
export function pageLinks(html: string, base: string, hostSuffix: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  $('a[href*="current_page="]').each((_, a) => {
    if (!/^\d+$/.test($(a).text().trim())) return;
    try {
      const link = safeUrlOnHost(new URL($(a).attr("href") ?? "", base).toString(), hostSuffix);
      if (link) seen.add(link);
    } catch {
      // an unreadable link is skipped
    }
  });
  return [...seen];
}

const MUSIC = /\b(concert|symphony|orchestra|tribute|live|band|recital|choir|jazz|rock|tour|songbook|tenors|music|beatles|beatlemania|mania|albums)\b/i;

export async function scrapeTessituraEvents(): Promise<{ inserted: number }> {
  const session = await openBrowserSession();
  const results = [];
  try {
    for (const hall of TESSITURA_HALLS) {
      if (!(await isAllowedByRobots(hall.url))) {
        console.error(`Tessitura scrape skipped for ${hall.url}: disallowed by robots.txt`);
        return { inserted: 0 };
      }
      const first = await session.fetchHtml(hall.url, { waitForSelector: CARD_DATE });
      if (!first.ok) {
        console.error(`Tessitura fetch failed for ${hall.url}: ${first.error}`);
        return { inserted: 0 }; // a half-read list must not replace the stored one
      }
      const events = parseTessituraPage(first.html, hall);
      for (const link of pageLinks(first.html, hall.url, hall.hostSuffix).slice(0, MAX_PAGES - 1)) {
        await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
        const next = await session.fetchHtml(link, { waitForSelector: CARD_DATE });
        if (!next.ok) {
          console.error(`Tessitura page failed for ${hall.url}: ${next.error}`);
          return { inserted: 0 };
        }
        events.push(...parseTessituraPage(next.html, hall));
      }
      console.log(`Tessitura: ${hall.venueName} ${events.length} performance(s)`);
      results.push({
        hall,
        events,
        eventType: (t: string) => (MUSIC.test(t) ? ("live_music" as const) : ("other" as const)),
        describe: () => "Ticketed event, tickets on the venue's box office.",
      });
    }
  } finally {
    await session.close();
  }
  return storeHallEvents(SOURCE_TAG, results);
}
