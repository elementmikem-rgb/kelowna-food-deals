import { isAllowedByRobots } from "./fetch";
import { rateLimit } from "./rateLimit";
import { decodeEntities } from "./eventClassify";
import { safeUrlOnHost } from "@/lib/safe-url";
import { storeHallEvents, type HallConfig, type HallEvent } from "./storeSource";

// ShoWare ticketing sites (the Regent Theatre in Oshawa runs one at tickets.regenttheatre.ca) list their shows
// with a script that calls a JSON endpoint, so the list is read from that endpoint directly: one request returns
// every upcoming performance with a real date and time. Found by hand in Chrome on 2026-11-05
// (docs/theatre-sources.md); add a site by adding its host and region here.
const SOURCE_TAG = "source:showare";
const USER_AGENT = "TodaysTabBot/1.0 (+https://todaystab.com)";
const PAGE_SIZE = 200;
const MAX_PAGES = 5;
const PAGE_DELAY_MS = 2500;

interface ShowareHall extends HallConfig {
  host: string; // e.g. tickets.regenttheatre.ca
  hostSuffix: string; // event links must stay on this domain, e.g. regenttheatre.ca
}

export const SHOWARE_HALLS: ShowareHall[] = [
  {
    host: "tickets.regenttheatre.ca",
    hostSuffix: "regenttheatre.ca",
    regionSlug: "durham-region",
    venueName: "Regent Theatre",
    address: "50 King St E, Oshawa",
  },
];

export interface ShowarePerformance {
  EventID?: number;
  Event?: string;
  PerformanceName?: string;
  PerformanceDateTime?: string;
}

const MONTHS: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

// "Friday, November 6, 2026 8:00:00 PM" -> { date: "2026-11-06", time: "20:00" }
export function parseShowareDateTime(text: string): { date: string; time: string | null } | null {
  const m = text.match(/([A-Za-z]+) (\d{1,2}), (\d{4})(?: (\d{1,2}):(\d{2})(?::\d{2})? ([AP]M))?/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const date = `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
  if (!m[4]) return { date, time: null };
  let h = Number(m[4]);
  const pm = m[6].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return { date, time: `${String(h).padStart(2, "0")}:${m[5]}` };
}

export function parseShowarePerformances(rows: ShowarePerformance[], hall: ShowareHall): HallEvent[] {
  const out: HallEvent[] = [];
  for (const r of rows) {
    const when = parseShowareDateTime(r.PerformanceDateTime ?? "");
    const title = decodeEntities(r.PerformanceName || r.Event || "").replace(/\s+/g, " ").trim();
    if (!when || !title) continue;
    const link = r.EventID ? safeUrlOnHost(`https://${hall.host}/eventperformances.asp?evt=${r.EventID}`, hall.hostSuffix) : null;
    out.push({ title, date: when.date, time: when.time, url: link });
  }
  return out;
}

const MUSIC = /\b(concert|symphony|orchestra|tribute|live|band|recital|choir|jazz|rock|tour|songbook|philharmonic|songs)\b/i;

async function fetchPerformances(hall: ShowareHall): Promise<ShowarePerformance[] | null> {
  const all: ShowarePerformance[] = [];
  const from = new Date().toISOString().slice(0, 10);
  for (let page = 1; page <= MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      fromDate: from, toDate: "2099-12-31", action: "perf", listPageSize: String(PAGE_SIZE), listMaxSize: String(PAGE_SIZE),
      page: String(page), showHidden: "0", showPackages: "0", swEvent: "0", venue: "0", category: "0", searchString: "", searchType: "0", city: "", cp: "0",
    });
    await rateLimit();
    const res = await fetch(`https://${hall.host}/include/widgets/events/performancelist.asp?${qs}`, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      console.error(`ShoWare fetch failed (HTTP ${res.status}) for ${hall.host}`);
      return null;
    }
    const json = (await res.json()) as { performance?: ShowarePerformance[]; perfCount?: number };
    const rows = json.performance ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  return all;
}

export async function scrapeShowareEvents(): Promise<{ inserted: number }> {
  const results = [];
  for (const hall of SHOWARE_HALLS) {
    if (!(await isAllowedByRobots(`https://${hall.host}/include/widgets/events/performancelist.asp`))) {
      console.error(`ShoWare scrape skipped for ${hall.host}: disallowed by robots.txt`);
      return { inserted: 0 };
    }
    const rows = await fetchPerformances(hall);
    if (rows === null) return { inserted: 0 }; // a half-read list must not replace the stored one
    const events = parseShowarePerformances(rows, hall);
    console.log(`ShoWare: ${hall.venueName} ${events.length} performance(s)`);
    results.push({
      hall,
      events,
      eventType: (t: string) => (MUSIC.test(t) ? ("live_music" as const) : ("other" as const)),
      describe: () => "Ticketed event, tickets on the venue's box office.",
    });
  }
  return storeHallEvents(SOURCE_TAG, results);
}
