import * as cheerio from "cheerio";
import { db, events, venues, regions } from "@/db";
import { eq, like, sql } from "drizzle-orm";
import { isAllowedByRobots } from "./fetch";
import { rateLimit } from "./rateLimit";
import { decodeEntities } from "./eventClassify";
import { safeUrlOnHost } from "@/lib/safe-url";
import type { EventType } from "../db/schema";

// Ovation (ovation.ca) is the ticketing network behind many Quebec halls. Each hall has its own six-character
// code and an "all events" page of plain HTML cards (title, French date and time, hall and city, an event link).
// A hall belongs to one of our regions, so the region is configured here rather than guessed from the city.
// Found by hand in Chrome on 2026-11-05 (docs/theatre-sources.md); add a hall by adding its code and region.
const SOURCE_TAG = "source:ovation";
const BASE_URL = "https://www.ovation.ca";
const USER_AGENT = "TodaysTabBot/1.0 (+https://todaystab.com)";
const PAGE_DELAY_MS = 2500;
const MIN_SHARE_OF_PREVIOUS = 0.5;

export const OVATION_HALLS: { code: string; regionSlug: string; name: string }[] = [
  { code: "00000P", regionSlug: "drummondville", name: "Maison des arts Desjardins" },
  { code: "00000V", regionSlug: "gatineau", name: "Salle Odyssée" },
  { code: "00000Z", regionSlug: "granby", name: "Palace de Granby" },
  { code: "00000R", regionSlug: "saguenay", name: "Diffusion Saguenay" },
  { code: "000016", regionSlug: "sherbrooke", name: "Théâtre Granada" },
];

export interface ParsedOvationEvent {
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  venueName: string | null;
  city: string | null;
  eventId: string;
}

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "jeudi 5 novembre 2026, 19h30" -> { date: "2026-11-05", time: "19:30" }; "19h" means 19:00.
export function parseFrenchDateTime(text: string): { date: string; time: string | null } | null {
  const m = strip(text).replace(/\s+/g, " ").match(/(\d{1,2})(?:er)? ([a-z]+) (\d{4})(?:,? (?:a )?(\d{1,2})\s*h\s*(\d{2})?)?/);
  if (!m) return null;
  const month = MONTHS[m[2]];
  if (!month) return null;
  const date = `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
  const time = m[4] ? `${String(Number(m[4])).padStart(2, "0")}:${m[5] ?? "00"}` : null;
  return { date, time };
}

export function parseOvationPage(html: string): ParsedOvationEvent[] {
  const $ = cheerio.load(html);
  const out: ParsedOvationEvent[] = [];
  $(".all-show").each((_, el) => {
    const card = $(el);
    const title = decodeEntities(card.find(".title").clone().children(".event-additional-name").remove().end().text())
      .replace(/\s+/g, " ")
      .trim();
    const eventId = (card.find('a[href*="eventId="]').first().attr("href") ?? "").match(/eventId=([A-Za-z0-9]+)/)?.[1];
    const infos = card.find(".info-show .text-info");
    const when = parseFrenchDateTime(infos.eq(0).text());
    if (!title || !eventId || !when) return;
    const [venueName = null, city = null] = (infos.eq(1).html() ?? "")
      .split(/<br\s*\/?>/i)
      .map((s) => decodeEntities(cheerio.load(`<p>${s}</p>`)("p").text()).replace(/\s+/g, " ").trim() || null);
    out.push({ title, date: when.date, time: when.time, venueName, city, eventId });
  });
  return out;
}

const MUSIC = /\b(concert|chanson|musique|musical|orchestre|symphon|jazz|rock|blues|folk|country|chorale|opera|opéra|hommage|tribute|dj)\b/i;

export function eventTypeFor(title: string): EventType {
  if (/karaok/i.test(title)) return "karaoke";
  if (/\btrivia\b/i.test(title)) return "trivia";
  return MUSIC.test(title) ? "live_music" : "other";
}

async function fetchPage(url: string): Promise<string | null> {
  await rateLimit();
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
  if (!res.ok) {
    console.error(`Ovation fetch failed (HTTP ${res.status}) for ${url}`);
    return null;
  }
  return res.text();
}

export async function scrapeOvationEvents(): Promise<{ inserted: number }> {
  const probe = `${BASE_URL}/${OVATION_HALLS[0].code}/fr/Search/AllEvents`;
  if (!(await isAllowedByRobots(probe))) {
    console.error("Ovation scrape skipped: disallowed by robots.txt");
    return { inserted: 0 };
  }
  const found: { hall: (typeof OVATION_HALLS)[number]; events: ParsedOvationEvent[] }[] = [];
  for (const hall of OVATION_HALLS) {
    const html = await fetchPage(`${BASE_URL}/${hall.code}/fr/Search/AllEvents`);
    if (html === null) return { inserted: 0 }; // a half-read list must not replace the stored one
    found.push({ hall, events: parseOvationPage(html) });
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  console.log(`Ovation: ${found.map((f) => `${f.hall.regionSlug} ${f.events.length}`).join(", ")}`);
  return storeOvationEvents(found);
}

export async function storeOvationEvents(
  found: { hall: (typeof OVATION_HALLS)[number]; events: ParsedOvationEvent[] }[]
): Promise<{ inserted: number }> {
  const regionRows = await db.select({ id: regions.id, slug: regions.slug }).from(regions).where(eq(regions.active, true));
  const regionIdBySlug = new Map(regionRows.map((r) => [r.slug, r.id]));
  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id]));

  const now = new Date();
  const seen = new Set<string>();
  const rows: (typeof events.$inferInsert)[] = [];
  for (const { hall, events: list } of found) {
    const regionId = regionIdBySlug.get(hall.regionSlug);
    if (regionId === undefined) continue;
    for (const e of list) {
      const key = `${hall.code}|${e.eventId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const link = safeUrlOnHost(`${BASE_URL}/${hall.code}/fr/Event/?eventId=${e.eventId}`, "ovation.ca");
      const matchedVenueId = e.venueName ? venueByRegionAndName.get(`${regionId}|${e.venueName.toLowerCase()}`) ?? null : null;
      rows.push({
        venueId: matchedVenueId,
        regionId,
        locationName: matchedVenueId ? null : e.venueName,
        locationAddress: matchedVenueId ? null : e.city,
        title: e.title,
        description: "Billets en vente sur Ovation.",
        eventType: eventTypeFor(e.title),
        dayOfWeek: null,
        specificDate: e.date,
        startTime: e.time,
        endTime: null,
        coverChargeCents: null,
        lastVerifiedAt: now,
        sourceUrl: link,
        confidence: 0.9,
        extractionNotes: `${SOURCE_TAG} | ${link ?? ""}`,
      });
    }
  }

  if (rows.length === 0) return { inserted: 0 };
  const [{ n: previous }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(like(events.extractionNotes, `${SOURCE_TAG}%`));
  if (previous >= 20 && rows.length < previous * MIN_SHARE_OF_PREVIOUS) {
    console.error(`Ovation scrape found ${rows.length} vs ${previous} stored; keeping the stored set.`);
    return { inserted: 0 };
  }
  await db.transaction(async (tx) => {
    await tx.delete(events).where(like(events.extractionNotes, `${SOURCE_TAG}%`));
    await tx.insert(events).values(rows);
  });
  return { inserted: rows.length };
}
