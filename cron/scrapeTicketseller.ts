import * as cheerio from "cheerio";
import { db, events, venues } from "@/db";
import { eq, like, sql } from "drizzle-orm";
import { isAllowedByRobots } from "./fetch";
import { rateLimit } from "./rateLimit";
import { classifyEventType, decodeEntities } from "./eventClassify";
import { buildRegionCityIndex, matchRegionByCity } from "./regionMatch";
import { safeUrlOnHost } from "@/lib/safe-url";
import type { EventType } from "../db/schema";

// Ticket Seller (ticketseller.ca) is the box office of the Vernon and District Performing Arts Centre and sells
// tickets for Prince George, Kamloops, Salmon Arm and other halls too. Its pages are plain HTML with schema.org
// event data (venue and address) plus a "Fri, Nov 6, 2026 At 7:30pm  $49" line per performance, so no
// browser is needed. Read slowly, once a night; robots.txt only closes /craft.
const SOURCE_TAG = "source:ticketseller";
const BASE_URL = "https://www.ticketseller.ca";
const USER_AGENT = "TodaysTabBot/1.0 (+https://todaystab.com)";
const PAGE_DELAY_MS = 2000;
const MIN_SHARE_OF_PREVIOUS = 0.5;
const MAX_PERFORMANCES_PER_EVENT = 40;

export interface TicketsellerPerformance {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface ParsedTicketsellerEvent {
  title: string;
  type: EventType;
  venueName: string | null;
  city: string | null;
  street: string | null;
  priceFromCents: number | null;
  performances: TicketsellerPerformance[];
  sourceUrl: string;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// "Fri, Nov 6, 2026 At 7:30pm  $49 All Seats" -> every performance line, with its first price.
const PERFORMANCE = /([A-Z][a-z]{2}),?\s+([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})\s+At\s+(\d{1,2})(?::(\d{2}))?\s*([ap]m)([^A-Za-z]{0,30}\$\s?(\d+(?:\.\d{1,2})?))?/gi;

export function parsePerformances(text: string): { performances: TicketsellerPerformance[]; priceFromCents: number | null } {
  const performances: TicketsellerPerformance[] = [];
  const prices: number[] = [];
  const seen = new Set<string>();
  for (const m of text.replace(/\s+/g, " ").matchAll(PERFORMANCE)) {
    const month = MONTHS[m[2].toLowerCase()];
    if (!month) continue;
    let hour = Number(m[5]);
    const pm = m[7].toLowerCase() === "pm";
    if (pm && hour !== 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
    const date = `${m[4]}-${String(month).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
    const time = `${String(hour).padStart(2, "0")}:${m[6] ?? "00"}`;
    if (!seen.has(date + time)) {
      seen.add(date + time);
      performances.push({ date, time });
    }
    if (m[9]) prices.push(Math.round(parseFloat(m[9]) * 100));
  }
  return { performances: performances.slice(0, MAX_PERFORMANCES_PER_EVENT), priceFromCents: prices.length ? Math.min(...prices) : null };
}

const TYPE_BY_SCHEMA: Record<string, EventType> = { MusicEvent: "live_music", SportsEvent: "sports_night" };

export function parseEventPage(html: string, url: string): ParsedTicketsellerEvent | null {
  const $ = cheerio.load(html);
  const blocks: Record<string, any>[] = [];
  $('script[type="application/ld+json"]').each((_, s) => {
    try {
      const d = JSON.parse($(s).text());
      if (typeof d["@type"] === "string" && /Event$/.test(d["@type"])) blocks.push(d);
    } catch {
      /* not JSON, skip */
    }
  });
  const ld = blocks[0] ?? null;
  const title = decodeEntities((ld?.name as string | undefined) ?? $("h1").first().text()).replace(/\s+/g, " ").trim();
  if (!title) return null;

  const body = $("main").length ? $("main").text() : $("body").text();
  const { performances, priceFromCents } = parsePerformances(body);
  if (performances.length === 0) return null;

  const addr = ld?.location?.address ?? {};
  const type = TYPE_BY_SCHEMA[ld?.["@type"] as string] ?? classifyEventType(title, "");
  return {
    title,
    type,
    venueName: ld?.location?.name ? decodeEntities(String(ld.location.name)).trim() : null,
    city: addr.addressLocality ? String(addr.addressLocality).trim() : null,
    street: addr.streetAddress ? String(addr.streetAddress).trim() : null,
    priceFromCents,
    performances,
    sourceUrl: url,
  };
}

export function parseEventLinks(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/tickets\/event\/([a-z0-9-]+)/g)) urls.add(`${BASE_URL}/tickets/event/${m[1]}`);
  return [...urls];
}

function dollars(cents: number): string {
  const d = cents / 100;
  return Number.isInteger(d) ? `$${d}` : `$${d.toFixed(2)}`;
}

export function buildDescription(e: ParsedTicketsellerEvent): string {
  return e.priceFromCents !== null ? `Ticketed event, tickets from ${dollars(e.priceFromCents)}.` : "Ticketed event, tickets at the box office.";
}

async function fetchHtml(url: string): Promise<string | null> {
  await rateLimit();
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
  if (!res.ok) {
    console.error(`Ticket Seller fetch failed (HTTP ${res.status}) for ${url}`);
    return null;
  }
  return res.text();
}

// The listing page shows the next few weeks; the monthly pages reach the rest of the season.
function listingUrls(): string[] {
  const urls = [`${BASE_URL}/tickets`];
  const d = new Date();
  for (let i = 0; i < 8; i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
    urls.push(`${BASE_URL}/tickets/${m.getUTCFullYear()}/${String(m.getUTCMonth() + 1).padStart(2, "0")}/01`);
  }
  return urls;
}

export async function scrapeTicketsellerEvents(): Promise<{ inserted: number }> {
  if (!(await isAllowedByRobots(`${BASE_URL}/tickets`))) {
    console.error("Ticket Seller scrape skipped: disallowed by robots.txt");
    return { inserted: 0 };
  }
  const eventUrls = new Set<string>();
  for (const url of listingUrls()) {
    const html = await fetchHtml(url);
    if (html) parseEventLinks(html).forEach((u) => eventUrls.add(u));
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  if (eventUrls.size === 0) return { inserted: 0 };

  const parsed: ParsedTicketsellerEvent[] = [];
  let unreadable = 0;
  for (const url of eventUrls) {
    const html = await fetchHtml(url);
    const ev = html ? parseEventPage(html, url) : null;
    if (ev) parsed.push(ev);
    else unreadable++;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  console.log(`Ticket Seller: ${eventUrls.size} events listed, ${parsed.length} read, ${unreadable} unreadable`);
  return storeTicketsellerEvents(parsed);
}

export async function storeTicketsellerEvents(parsed: ParsedTicketsellerEvent[]): Promise<{ inserted: number }> {
  const cityIndex = await buildRegionCityIndex();
  if (cityIndex.cities.size === 0) return { inserted: 0 };

  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id]));

  // Skip a show another feed (the Box Office, Showpass) already carries.
  const others = await db
    .select({ regionId: events.regionId, title: events.title, date: events.specificDate })
    .from(events)
    .where(sql`${events.extractionNotes} like 'source:boxoffice%' or ${events.extractionNotes} like 'source:showpass%'`);
  const otherKeys = new Set(others.map((o) => `${o.regionId}|${o.title.toLowerCase()}|${o.date}`));

  const now = new Date();
  const seen = new Set<string>();
  const rows: (typeof events.$inferInsert)[] = [];
  const skipped = new Map<string, number>();
  for (const e of parsed) {
    const regionId = matchRegionByCity(e.city ?? "", null, cityIndex);
    if (regionId === null) {
      skipped.set(e.city ?? "?", (skipped.get(e.city ?? "?") ?? 0) + 1);
      continue;
    }
    const link = safeUrlOnHost(e.sourceUrl, "ticketseller.ca");
    const matchedVenueId = e.venueName ? venueByRegionAndName.get(`${regionId}|${e.venueName.toLowerCase()}`) ?? null : null;
    for (const p of e.performances) {
      const key = `${regionId}|${e.title.toLowerCase()}|${p.date}`;
      if (otherKeys.has(key)) continue;
      const dedupe = `${key}|${p.time}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      rows.push({
        venueId: matchedVenueId,
        regionId,
        locationName: matchedVenueId ? null : e.venueName,
        locationAddress: matchedVenueId ? null : [e.street, e.city].filter(Boolean).join(", ") || null,
        title: e.title,
        description: buildDescription(e),
        eventType: e.type,
        dayOfWeek: null,
        specificDate: p.date,
        startTime: p.time,
        endTime: null,
        coverChargeCents: null,
        lastVerifiedAt: now,
        sourceUrl: link,
        confidence: 0.9,
        extractionNotes: `${SOURCE_TAG} | ${link ?? ""}`,
      });
    }
  }
  if (skipped.size > 0) console.log(`Ticket Seller: skipped events in cities with no single region: ${[...skipped].map(([c, n]) => `${c} (${n})`).join(", ")}`);

  if (rows.length === 0) return { inserted: 0 };
  const [{ n: previous }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(like(events.extractionNotes, `${SOURCE_TAG}%`));
  if (previous >= 20 && rows.length < previous * MIN_SHARE_OF_PREVIOUS) {
    console.error(`Ticket Seller scrape found ${rows.length} vs ${previous} stored; keeping the stored set.`);
    return { inserted: 0 };
  }
  await db.transaction(async (tx) => {
    await tx.delete(events).where(like(events.extractionNotes, `${SOURCE_TAG}%`));
    await tx.insert(events).values(rows);
  });
  return { inserted: rows.length };
}
