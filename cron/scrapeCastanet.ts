import * as cheerio from "cheerio";
import { db, events, venues } from "@/db";
import { like } from "drizzle-orm";
import type { EventType } from "../db/schema";

const SOURCE_TAG = "source:castanet";
const USER_AGENT = "KelownaSpecialsBot/1.0 (+https://kelownafooddeals.shop)";

// Nightlife-adjacent only — Castanet's events feed also covers sports, art,
// markets, kids camps, health/non-profit listings, which don't belong on a
// bar/restaurant specials site.
const ALLOWED_CATEGORIES = new Set([
  "concerts",
  "comedy",
  "pubs/clubs",
  "wineries/breweries",
  "dances/parties",
]);

const TARGET_CITY = /\b(kelowna|west kelowna|peachland|lake country)\b/i;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

interface ParsedCastanetEvent {
  title: string;
  description: string | null;
  locationName: string;
  locationAddress: string;
  specificDate: string | null;
  startTime: string | null;
  sourceUrl: string;
}

function classifyEventType(title: string, description: string): EventType {
  const text = `${title} ${description}`.toLowerCase();
  if (/karaoke/.test(text)) return "karaoke";
  if (/trivia/.test(text)) return "trivia";
  if (/\blive music\b|\bband\b|\bdj\b/.test(text)) return "live_music";
  return "other";
}

function parseCoverCharge(description: string): number | null {
  const match = description.match(/\$(\d+(?:\.\d{2})?)\s*(cover|ticket|admission|door)/i);
  if (!match) return null;
  return Math.round(parseFloat(match[1]) * 100);
}

// Castanet's CMS double-encodes some entities (e.g. literal "&ndash;" text
// survives cheerio's normal decoding), so decode common ones a second pass.
function decodeEntities(text: string): string {
  return text
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function pacificToday(): Date {
  const parts = new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" }).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function parseDateTime(dateLine: string): { specificDate: string | null; startTime: string | null } {
  const cleaned = dateLine.replace(/\s+/g, " ").trim();
  const dateMatch = cleaned.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
  if (!dateMatch) return { specificDate: null, startTime: null };

  const month = MONTHS[dateMatch[1].toLowerCase()];
  const day = Number(dateMatch[2]);
  if (!month) return { specificDate: null, startTime: null };

  const today = pacificToday();
  let year = today.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const diffDays = (today.getTime() - candidate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) year += 1; // e.g. scraping in December for an early-January event

  const specificDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let startTime: string | null = null;
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2];
    const isPM = /pm/i.test(timeMatch[3]);
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    startTime = `${String(hour).padStart(2, "0")}:${minute}`;
  }

  return { specificDate, startTime };
}

async function fetchAndParse(url: string): Promise<ParsedCastanetEvent[]> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.error(`Castanet fetch failed for ${url}: HTTP ${res.status}`);
    return [];
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const list = $("#event_list");
  if (list.length === 0) return [];

  const results: ParsedCastanetEvent[] = [];
  let currentCategory = "";

  for (const child of list.children().toArray()) {
    const $child = $(child);
    if ($child.hasClass("events_category_header")) {
      currentCategory = $child.text().trim().toLowerCase();
      continue;
    }
    if (!$child.hasClass("event_line")) continue;
    if (!ALLOWED_CATEGORIES.has(currentCategory)) continue;

    const titleLink = $child.find(".event_title").first();
    const title = titleLink.text().trim();
    const href = titleLink.attr("href");
    if (!title || !href) continue;

    const content = $child.find(".event_content").first();
    const description = content.find(".event_descr").text().trim() || null;
    const timeEl = content.find(".event_time").first();
    const timeHtml = timeEl.html() ?? "";
    const [locationLine = "", dateLine = ""] = timeHtml.split(/<br\s*\/?>/i).map((s) =>
      cheerio.load(`<div>${s}</div>`)("div").text().replace(/\s+/g, " ").trim()
    );

    if (!TARGET_CITY.test(locationLine)) continue;

    const { specificDate, startTime } = parseDateTime(dateLine);
    if (!specificDate) continue;

    results.push({
      title: decodeEntities(title),
      description: description ? decodeEntities(description) : null,
      locationName: locationLine.split(",")[0].trim(),
      locationAddress: locationLine,
      specificDate,
      startTime,
      sourceUrl: href.startsWith("http") ? href : `https://www.castanet.net${href}`,
    });
  }

  return results;
}

export async function scrapeCastanetEvents(): Promise<{ inserted: number }> {
  const [todayEvents, weekendEvents] = await Promise.all([
    fetchAndParse("https://www.castanet.net/events/"),
    fetchAndParse("https://www.castanet.net/events/weekend"),
  ]);

  const seen = new Map<string, ParsedCastanetEvent>();
  for (const e of [...todayEvents, ...weekendEvents]) {
    // Some listings appear under different URLs on the "today" vs "weekend"
    // pages for the same real-world event — dedupe on content, not just URL.
    const contentKey = `${e.title.toLowerCase()}|${e.specificDate}|${e.locationName.toLowerCase()}`;
    if (!seen.has(e.sourceUrl) && !seen.has(contentKey)) {
      seen.set(e.sourceUrl, e);
      seen.set(contentKey, e);
    }
  }
  const parsed = Array.from(new Set(seen.values()));

  const knownVenues = await db.select({ id: venues.id, name: venues.name }).from(venues);
  const venueByName = new Map(knownVenues.map((v) => [v.name.trim().toLowerCase(), v.id]));

  // Refresh strategy: this is a short rolling window (today + weekend), so
  // wipe yesterday's castanet-sourced rows and insert the fresh set rather
  // than trying to diff/upsert against a source with no stable IDs of its own.
  // Guard against an empty result BEFORE deleting -- fetchAndParse returns [] on
  // any upstream failure (non-2xx, markup change), and deleting first would wipe
  // the whole feed on every such outage instead of leaving yesterday's data up.
  if (parsed.length === 0) return { inserted: 0 };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(events).where(like(events.extractionNotes, `${SOURCE_TAG}%`));
    await tx.insert(events).values(
      parsed.map((e) => {
        const matchedVenueId = venueByName.get(e.locationName.toLowerCase()) ?? null;
        return {
          venueId: matchedVenueId,
          locationName: matchedVenueId ? null : e.locationName,
          locationAddress: matchedVenueId ? null : e.locationAddress,
          title: e.title,
          description: e.description,
          eventType: classifyEventType(e.title, e.description ?? ""),
          dayOfWeek: null,
          specificDate: e.specificDate,
          startTime: e.startTime,
          endTime: null,
          coverChargeCents: parseCoverCharge(e.description ?? ""),
          lastVerifiedAt: now,
          sourceUrl: e.sourceUrl,
          confidence: 0.9,
          extractionNotes: `${SOURCE_TAG} | ${e.sourceUrl}`,
        };
      })
    );
  });

  return { inserted: parsed.length };
}
