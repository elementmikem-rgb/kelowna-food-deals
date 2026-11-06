import * as cheerio from "cheerio";
import { db, events, venues } from "@/db";
import { eq, like, sql } from "drizzle-orm";
import { openBrowserSession, type BrowserSession } from "./fetch";
import { decodeEntities } from "./eventClassify";
import { buildRegionCityMatchers, matchRegionForLocation } from "./regionMatch";
import type { EventType } from "../db/schema";

// The Box Office (theboxoffice.ca) is the ticketing site for Kelowna Community Theatre, the Rotary Centre for
// the Arts, the Black Box Theatre, the UBCO gym, Penticton's Cleland Theatre and a few other halls. One
// listing, many venues: each event is attributed to whichever region its venue address falls in, and to one of
// our own venues when the name matches, otherwise it keeps the venue name and address as plain text.
//
// A plain server-side fetch gets a 403 (bot protection), so every request goes through the headless browser
// session the other scrapers use. robots.txt allows the listing and detail pages.
const SOURCE_TAG = "source:boxoffice";
const BASE_URL = "https://www.theboxoffice.ca";
const MAX_LISTING_PAGES = 12;
// One run reads every listing page plus every event's own page, so it is slow; the nightly cron gives it a long timeout.
const MAX_SHOWTIMES_PER_EVENT = 40;
// A run that finds less than this share of what the last run stored is treated as a partial failure (the site
// changed, a page timed out) and leaves yesterday's rows alone instead of replacing them with a fragment.
const MIN_SHARE_OF_PREVIOUS = 0.5;

export interface BoxOfficeShowtime {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
}

export interface ParsedBoxOfficeEvent {
  title: string;
  venueName: string | null;
  venueAddress: string | null;
  category: string | null;
  priceFromCents: number | null;
  showtimes: BoxOfficeShowtime[];
  sourceUrl: string;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// "Thu, Nov 5th 2026 | 7:30 pm" -> { date: "2026-11-05", time: "19:30" }; the time part is optional.
export function parseShowtime(line: string): BoxOfficeShowtime | null {
  const m = line.replace(/\s+/g, " ").match(/([A-Za-z]{3})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})(?:\s*\|\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const date = `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
  if (!m[4]) return { date, time: null };
  let hour = Number(m[4]);
  const pm = m[6].toLowerCase() === "pm";
  if (pm && hour !== 12) hour += 12;
  if (!pm && hour === 12) hour = 0;
  return { date, time: `${String(hour).padStart(2, "0")}:${m[5] ?? "00"}` };
}

// "$19.99 - $31.46 including fees & GST" -> 1999; "Prices vary" -> null.
export function parsePriceFromCents(text: string): number | null {
  const amounts = [...text.matchAll(/\$\s?(\d+(?:\.\d{1,2})?)/g)].map((m) => Math.round(parseFloat(m[1]) * 100));
  return amounts.length ? Math.min(...amounts) : null;
}

const SMALL_WORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "x"]);

// The site writes many titles in capitals ("OKANAGAN FIGHT NIGHT 8", "3rd ANNUAL HITS FOR HERITAGE"). Turn a mostly
// capitals title into Title Case and leave a mixed-case one alone ("UBCO Heat vs UBC Thunderbirds"). A dangling
// colon or dash left by the page's own line break ("SWEET CAROLINE -") is dropped.
export function tidyTitle(raw: string): string {
  const title = decodeEntities(raw).replace(/\s+/g, " ").replace(/[\s:-]+$/, "").trim();
  const letters = title.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const upper = letters.replace(/[^A-ZÀ-ß]/g, "");
  if (!letters || upper.length / letters.length < 0.8) return title;
  return title
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.replace(/(^|[-(])([a-zà-ÿ])/g, (_, p, c) => p + c.toUpperCase())))
    .join(" ")
    .replace(/\bMc([a-z])/g, (_, c) => "Mc" + c.toUpperCase());
}

// The site's own tag for the event -> our event type. Concerts are live music and games are sports nights;
// everything else (ballet, film, comedy, festivals) has no type of its own yet and stays "other".
export function eventTypeForCategory(category: string | null): EventType {
  const c = (category ?? "").toLowerCase();
  if (c === "music") return "live_music";
  if (c === "sports") return "sports_night";
  return "other";
}

// "1375 Water St, Kelowna, BC" -> "Kelowna". Region matching looks only at this city: matching the whole address
// also catches the province, and a few venues in the database carry "BC" as their city, which made every BC
// address look like it belonged to several regions at once.
export function cityOfAddress(address: string): string {
  const m = address.match(/,\s*([^,]+?),?\s*(?:BC|B\.C\.|British Columbia)\s*$/i);
  return (m ? m[1] : address).trim();
}

function formatDollars(cents: number): string {
  const d = cents / 100;
  return Number.isInteger(d) ? `$${d}` : `$${d.toFixed(2)}`;
}

export function parseListingLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $('a[href^="/upcoming-events/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.includes("?") || href.includes("#")) return;
    if (href.split("/").filter(Boolean).length !== 2) return;
    urls.add(`${BASE_URL}${href}`);
  });
  return [...urls];
}

export function parseEventPage(html: string, url: string): ParsedBoxOfficeEvent | null {
  const $ = cheerio.load(html);
  const title = tidyTitle($("h1").first().text());
  if (!title) return null;

  const loc = $(".event-location-details .locations").first();
  const venueName =
    loc
      .children("div")
      .first()
      .contents()
      .filter((_, n) => n.type === "text")
      .text()
      .replace(/\s+/g, " ")
      .trim() || null;
  const venueAddress = loc.find("p").first().text().replace(/\s+/g, " ").trim() || null;

  const showtimes: BoxOfficeShowtime[] = [];
  $(".event-date div div").each((_, el) => {
    if ($(el).children().length > 0) return;
    const st = parseShowtime($(el).text());
    if (st) showtimes.push(st);
  });
  if (showtimes.length === 0) return null;

  const priceText = $(".event-price").first().text().replace(/\s+/g, " ").trim();
  const category = $(".event-tags .event-text.category").first().text().replace(/\s+/g, " ").trim() || null;

  return {
    title,
    venueName,
    venueAddress,
    category,
    priceFromCents: parsePriceFromCents(priceText),
    showtimes: showtimes.slice(0, MAX_SHOWTIMES_PER_EVENT),
    sourceUrl: url,
  };
}

// One line a visitor can use: the kind of event and what a ticket costs. The page's own promotional blurb is
// not copied; the event page it came from is the place to read it.
export function buildDescription(e: ParsedBoxOfficeEvent): string {
  const parts: string[] = [];
  parts.push(e.category ? `${e.category} · ticketed` : "Ticketed event");
  parts.push(e.priceFromCents !== null ? `tickets from ${formatDollars(e.priceFromCents)} with fees` : "ticket prices vary");
  return `${parts.join(", ")}.`;
}

// The pages fill in after the load event, so a read taken a moment too early comes back as a shell with no events
// in it (seen live: a listing page with zero links, an event page with no dates, then fine on the next try). Ask
// again, a little later each time, until the page parses or the tries run out.
const FETCH_TRIES = 3;
const PAGE_DELAY_MS = 4000;

async function fetchParsed<T>(session: BrowserSession, url: string, parse: (html: string) => T | null): Promise<T | null> {
  for (let attempt = 1; attempt <= FETCH_TRIES; attempt++) {
    const result = await session.fetchHtml(url);
    if (result.ok) {
      const value = parse(result.html);
      if (value !== null) return value;
    } else {
      console.error(`Box Office fetch failed for ${url}: ${result.error}`);
    }
    if (attempt < FETCH_TRIES) await new Promise((r) => setTimeout(r, attempt * 3000));
  }
  return null;
}

// Replaces the stored Box Office rows with one row per showtime of `parsed`. Split from the fetching so the
// same step can store events that were read some other way (for example by hand in Chrome).
export async function storeBoxOfficeEvents(parsed: ParsedBoxOfficeEvent[]): Promise<{ inserted: number }> {
  const regionMatchers = await buildRegionCityMatchers();
  if (regionMatchers.size === 0) return { inserted: 0 };

  // One row per showtime, attributed to the region the venue's address is in.
  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id]));

  const now = new Date();
  const seen = new Set<string>();
  const rows: (typeof events.$inferInsert)[] = [];
  for (const e of parsed) {
    const regionId = matchRegionForLocation(cityOfAddress(e.venueAddress ?? e.venueName ?? ""), regionMatchers);
    if (regionId === null) continue;
    const matchedVenueId = e.venueName ? venueByRegionAndName.get(`${regionId}|${e.venueName.toLowerCase()}`) ?? null : null;
    for (const st of e.showtimes) {
      const key = `${e.title.toLowerCase()}|${st.date}|${st.time}|${(e.venueName ?? "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        venueId: matchedVenueId,
        regionId,
        locationName: matchedVenueId ? null : e.venueName,
        locationAddress: matchedVenueId ? null : e.venueAddress,
        title: e.title,
        description: buildDescription(e),
        eventType: eventTypeForCategory(e.category),
        dayOfWeek: null,
        specificDate: st.date,
        startTime: st.time,
        endTime: null,
        // Left empty on purpose: the price is a ticket price (it is in the description), and "cover" on a
        // theatre ticket would read wrong.
        coverChargeCents: null,
        lastVerifiedAt: now,
        sourceUrl: e.sourceUrl,
        confidence: 0.9,
        extractionNotes: `${SOURCE_TAG} | ${e.sourceUrl}`,
      });
    }
  }

  // Never replace a good feed with nothing, or with a fragment of it.
  if (rows.length === 0) return { inserted: 0 };
  const [{ n: previous }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(like(events.extractionNotes, `${SOURCE_TAG}%`));
  if (previous >= 20 && rows.length < previous * MIN_SHARE_OF_PREVIOUS) {
    console.error(`Box Office scrape found ${rows.length} showtimes vs ${previous} stored; keeping the stored set.`);
    return { inserted: 0 };
  }

  await db.transaction(async (tx) => {
    await tx.delete(events).where(like(events.extractionNotes, `${SOURCE_TAG}%`));
    await tx.insert(events).values(rows);
  });
  return { inserted: rows.length };
}

export async function scrapeBoxOfficeEvents(): Promise<{ inserted: number }> {
  const parsed: ParsedBoxOfficeEvent[] = [];
  const session = await openBrowserSession();
  try {
    const eventUrls: string[] = [];
    for (let page = 0; page < MAX_LISTING_PAGES; page++) {
      // A page with no new links, even after retries, is the end of the list.
      const fresh = await fetchParsed(session, `${BASE_URL}/upcoming-events?page=${page}`, (html) => {
        const links = parseListingLinks(html).filter((u) => !eventUrls.includes(u));
        return links.length > 0 ? links : null;
      });
      if (!fresh) break;
      eventUrls.push(...fresh);
    }
    let unreadable = 0;
    for (const url of eventUrls) {
      const ev = await fetchParsed(session, url, (html) => parseEventPage(html, url));
      if (ev) parsed.push(ev);
      else unreadable++;
      // A few seconds between event pages on top of the shared rate limit: this is one site's whole calendar,
      // read once a night, and there is no hurry.
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }
    console.log(`Box Office: ${eventUrls.length} events listed, ${parsed.length} read, ${unreadable} unreadable`);
  } finally {
    await session.close();
  }

  return storeBoxOfficeEvents(parsed);
}
