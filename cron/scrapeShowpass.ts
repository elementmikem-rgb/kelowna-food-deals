import { db, events, venues } from "@/db";
import { eq, like, sql } from "drizzle-orm";
import { isAllowedByRobots } from "./fetch";
import { rateLimit } from "./rateLimit";
import { classifyEventType } from "./eventClassify";
import { safeUrlOnHost } from "@/lib/safe-url";
import { buildRegionCityIndex, matchRegionByCity, parsePosition } from "./regionMatch";
import type { EventType } from "../db/schema";

// Showpass (showpass.com) sells tickets for theatres, arts centres, comedy rooms and many bars across the
// country, and publishes every event as JSON at /api/public/events/ (its robots.txt allows /api/). One slow pass
// through the whole list, keeping only events at performance halls in a region we cover, fills in theatres in
// many towns at once. The venue and region are read from the event's own location, not guessed.
const SOURCE_TAG = "source:showpass";
const API_URL = "https://www.showpass.com/api/public/events/";
const USER_AGENT = "TodaysTabBot/1.0 (+https://todaystab.com)";
const PAGE_SIZE = 100;
const MAX_PAGES = 250;
const PAGE_DELAY_MS = 1500;
const MIN_SHARE_OF_PREVIOUS = 0.5;

// A location counts as a performance hall when its name says so. Bars, markets, stadiums and conference rooms
// are left to the other event sources; this is about theatres and the like.
const HALL_NAME = /\b(theat(?:re|er)s?|playhouse|performing arts|arts cent(?:re|er)|concert hall|performance hall|auditorium|opera house|cultural cent(?:re|er)|symphony hall|music hall|civic cent(?:re|er)|memorial cent(?:re|er)|festival place|community hall)\b/i;
// "Movie theatre" and "Cinema" listings are screenings, not live shows.
const NOT_A_HALL = /\b(cinemas?|movie theat(?:re|er)s?|imax)\b/i;

export function isPerformanceHall(locationName: string | null | undefined): boolean {
  if (!locationName) return false;
  return HALL_NAME.test(locationName) && !NOT_A_HALL.test(locationName);
}

export interface ShowpassEvent {
  id: number;
  name: string;
  local_starts_on: string | null;
  is_published?: boolean;
  status?: string;
  sold_out?: boolean;
  is_recurring_parent?: boolean;
  frontend_details_url: string | null;
  location: { name: string | null; street_name: string | null; city: string | null; province: string | null; position?: string | null } | null;
}

// "Sienna Spiro - Vogue Theatre - BC" -> "Sienna Spiro": the hall's own name and a trailing province are
// added by promoters to make the listing searchable, and the venue is shown next to the title anyway.
export function cleanTitle(name: string, locationName: string | null): string {
  const PROV = /\s*[-–|@]\s*(?:BC|AB|British Columbia|Alberta)\s*$/i;
  let t = name.replace(/\s+/g, " ").trim().replace(PROV, "");
  if (locationName) {
    const base = locationName.replace(PROV, "").trim();
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (esc) t = t.replace(new RegExp(`\\s*[-–|@]\\s*${esc}\\s*$`, "i"), "");
  }
  return t.trim();
}

// "2026-11-05T20:00:00-07:00" -> the local date and time as the venue shows them.
export function localDateTime(local: string | null): { date: string; time: string } | null {
  const m = local?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : null;
}

const MUSIC_WORDS = /\b(live|concert|tour|band|symphony|orchestra|choir|jazz|quartet|trio|recital|tribute|album|acoustic|festival)\b/i;

export function eventTypeFor(title: string): EventType {
  const t = classifyEventType(title, "");
  if (t !== "other") return t;
  return MUSIC_WORDS.test(title) ? "live_music" : "other";
}

export function isUsable(e: ShowpassEvent): boolean {
  if (e.is_published === false) return false;
  if (e.status && e.status !== "sp_event_active") return false;
  if (e.is_recurring_parent) return false;
  return !!e.location && isPerformanceHall(e.location.name) && !!localDateTime(e.local_starts_on);
}

export function describe(e: ShowpassEvent): string {
  return e.sold_out ? "Ticketed event, sold out on Showpass." : "Ticketed event, tickets on Showpass.";
}

async function fetchJson(url: string): Promise<{ results: ShowpassEvent[]; next: string | null } | null> {
  await rateLimit();
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) {
    console.error(`Showpass fetch failed (HTTP ${res.status}) for ${url}`);
    return null;
  }
  return (await res.json()) as { results: ShowpassEvent[]; next: string | null };
}

export async function scrapeShowpassEvents(): Promise<{ inserted: number }> {
  const start = `${API_URL}?page_size=${PAGE_SIZE}&starts_on__gte=${encodeURIComponent(new Date().toISOString())}`;
  if (!(await isAllowedByRobots(start))) {
    console.error("Showpass scrape skipped: disallowed by robots.txt");
    return { inserted: 0 };
  }

  const found: ShowpassEvent[] = [];
  let url: string | null = start;
  let pages = 0;
  while (url && pages < MAX_PAGES) {
    const page = await fetchJson(url);
    if (!page) return { inserted: 0 }; // a half-read list must not replace the stored one
    found.push(...page.results.filter(isUsable));
    url = page.next;
    pages++;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  console.log(`Showpass: read ${pages} page(s), ${found.length} event(s) at performance halls`);
  return storeShowpassEvents(found);
}

export async function storeShowpassEvents(found: ShowpassEvent[]): Promise<{ inserted: number }> {
  const cityIndex = await buildRegionCityIndex();
  if (cityIndex.cities.size === 0) return { inserted: 0 };

  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id]));

  // The Box Office feed already carries Kelowna and Penticton halls; skip a Showpass copy of the same show.
  const boxOffice = await db
    .select({ regionId: events.regionId, title: events.title, date: events.specificDate })
    .from(events)
    .where(like(events.extractionNotes, "source:boxoffice%"));
  const boxKeys = new Set(boxOffice.map((b) => `${b.regionId}|${b.title.toLowerCase()}|${b.date}`));

  const now = new Date();
  const seen = new Set<string>();
  const skippedCities = new Map<string, number>();
  const rows: (typeof events.$inferInsert)[] = [];
  for (const e of found) {
    const loc = e.location!;
    const dt = localDateTime(e.local_starts_on)!;
    const regionId = matchRegionByCity(loc.city ?? "", parsePosition(loc.position), cityIndex);
    if (regionId === null) {
      skippedCities.set(loc.city ?? "?", (skippedCities.get(loc.city ?? "?") ?? 0) + 1);
      continue;
    }
    const title = cleanTitle(e.name, loc.name);
    // The link comes from the feed, so it is kept only if it really is an https link on showpass.com.
    const link = safeUrlOnHost(e.frontend_details_url, "showpass.com");
    const key = `${regionId}|${title.toLowerCase()}|${dt.date}`;
    if (boxKeys.has(key)) continue;
    const dedupe = `${key}|${dt.time}|${(loc.name ?? "").toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const matchedVenueId = loc.name ? venueByRegionAndName.get(`${regionId}|${loc.name.trim().toLowerCase()}`) ?? null : null;
    rows.push({
      venueId: matchedVenueId,
      regionId,
      locationName: matchedVenueId ? null : loc.name,
      locationAddress: matchedVenueId ? null : [loc.street_name, loc.city, loc.province].filter(Boolean).join(", ") || null,
      title,
      description: describe(e),
      eventType: eventTypeFor(title),
      dayOfWeek: null,
      specificDate: dt.date,
      startTime: dt.time,
      endTime: null,
      coverChargeCents: null,
      lastVerifiedAt: now,
      sourceUrl: link,
      confidence: 0.9,
      extractionNotes: `${SOURCE_TAG} | ${link ?? ""}`,
    });
  }
  if (skippedCities.size > 0) {
    const top = [...skippedCities].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c} (${n})`).join(", ");
    console.log(`Showpass: ${[...skippedCities.values()].reduce((a, b) => a + b, 0)} event(s) in cities with no single matching region, skipped: ${top}`);
  }

  if (rows.length === 0) return { inserted: 0 };
  const [{ n: previous }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(like(events.extractionNotes, `${SOURCE_TAG}%`));
  if (previous >= 20 && rows.length < previous * MIN_SHARE_OF_PREVIOUS) {
    console.error(`Showpass scrape found ${rows.length} vs ${previous} stored; keeping the stored set.`);
    return { inserted: 0 };
  }
  await db.transaction(async (tx) => {
    await tx.delete(events).where(like(events.extractionNotes, `${SOURCE_TAG}%`));
    await tx.insert(events).values(rows);
  });
  return { inserted: rows.length };
}
