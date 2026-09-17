import { db, events, venues } from "@/db";
import { eq, like } from "drizzle-orm";
import { rateLimit } from "./rateLimit";
import { classifyEventType, decodeEntities, pacificToday } from "./eventClassify";
import { buildRegionCityMatchers, matchRegionForLocation } from "./regionMatch";

const SOURCE_TAG = "source:604now";
const USER_AGENT = "KelownaSpecialsBot/1.0 (+https://kelownafooddeals.shop)";
const API_BASE = "https://604now.com/wp-json/tribe/events/v1/events";

// Confirmed live 2026-09-12: a clean, public WordPress "The Events Calendar"
// REST API (not a scraped page -- the site's own /events/ page is a JS-
// rendered shell with nothing in its static HTML). robots.txt allows it
// (empty Disallow), and it already tags events with the same nightlife-
// adjacent categories Castanet/NowMedia use their own allowlists for.
// 604now.com covers the whole Lower Mainland (Vancouver, Richmond, Delta,
// Langley, Abbotsford, Chilliwack, North Vancouver, White Rock, New
// Westminster, Port Coquitlam, and more) under ONE site, unlike NowMedia's
// one-site-per-city model -- so this is a GLOBAL source like Castanet, not a
// per-region SITES array like scrapeNowMedia.ts. Each event's own
// venue.city field (not a fixed city list) gets matched against whichever
// active region actually has a venue in that city, via the same
// buildRegionCityMatchers() Castanet uses.
const ALLOWED_CATEGORY_SLUGS = "nightlife-clubs,concerts-shows,food-experiences";

// A short, bounded forward window -- this cares about what's coming up soon,
// not a venue's entire future calendar. Verified live: a 14-day window across
// the three allowed categories returns single digits, so pagination is a
// safety net, not something expected to trigger in practice.
const WINDOW_DAYS = 14;
const MAX_PAGES = 5;
const PER_PAGE = 50;

interface RawVenue {
  venue?: string;
  city?: string;
  address?: string;
}

interface RawEvent {
  title: string;
  description: string;
  url: string;
  cost: string;
  start_date: string; // "YYYY-MM-DD HH:MM:SS"
  end_date: string;
  all_day: boolean;
  venue?: RawVenue;
}

interface ParsedEvent {
  title: string;
  description: string | null;
  locationName: string | null;
  locationCity: string | null;
  specificDate: string;
  startTime: string | null;
  endTime: string | null;
  coverChargeCents: number | null;
  sourceUrl: string;
}

// A stripped-down parser for this API's own "cost" field (e.g. "$10 – $20",
// "Free") -- deliberately not eventClassify's parseCoverCharge, which
// requires a nearby keyword like "cover"/"tickets" in free-text prose. This
// field IS the cost, unconditionally, so that requirement would just drop
// every real price for no reason. A range shows the lower amount, same
// "what most attendees actually pay" logic parseCoverCharge itself uses.
function parseCostField(cost: string): number | null {
  const amounts = Array.from(cost.matchAll(/\$(\d+(?:\.\d{1,2})?)/g)).map((m) =>
    Math.round(parseFloat(m[1]) * 100)
  );
  return amounts.length > 0 ? Math.min(...amounts) : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTime(dateTime: string, allDay: boolean): string | null {
  if (allDay) return null;
  const match = dateTime.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2}):\d{2}/);
  return match ? match[1] : null;
}

async function fetchPage(url: string): Promise<{ events: RawEvent[]; next: string | null } | null> {
  try {
    await rateLimit();
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (!res.ok) {
      console.error(`604Now fetch failed for ${url}: HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { events?: RawEvent[]; next_rest_url?: string | null };
    return { events: data.events ?? [], next: data.next_rest_url ?? null };
  } catch (err) {
    console.error(`604Now fetch failed for ${url}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function fetchUpcomingEvents(): Promise<ParsedEvent[]> {
  const today = pacificToday();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + WINDOW_DAYS);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  let url =
    `${API_BASE}?categories=${ALLOWED_CATEGORY_SLUGS}` +
    `&start_date=${fmt(today)}&end_date=${fmt(endDate)}&per_page=${PER_PAGE}`;

  const parsed: ParsedEvent[] = [];
  for (let page = 0; page < MAX_PAGES && url; page++) {
    const result = await fetchPage(url);
    if (!result) break;

    for (const raw of result.events) {
      // Only stated day/date events qualify -- an event with no real
      // start_date has nothing to schedule against.
      if (!raw.start_date) continue;
      const dateMatch = raw.start_date.match(/^\d{4}-\d{2}-\d{2}/);
      if (!dateMatch) continue;

      parsed.push({
        title: decodeEntities(raw.title),
        description: raw.description ? decodeEntities(stripHtml(raw.description)).slice(0, 2000) || null : null,
        locationName: raw.venue?.venue?.trim() || null,
        locationCity: raw.venue?.city?.trim() || null,
        specificDate: dateMatch[0],
        startTime: parseTime(raw.start_date, raw.all_day),
        endTime: parseTime(raw.end_date, raw.all_day),
        coverChargeCents: raw.cost ? parseCostField(raw.cost) : null,
        sourceUrl: raw.url,
      });
    }

    url = result.next ?? "";
  }
  return parsed;
}

export async function scrape604NowEvents(): Promise<{ inserted: number }> {
  // GLOBAL source like Castanet, not region-scoped like NowMedia's SITES
  // array -- one fetch covers every region at once, attributed after the
  // fact by each event's own venue city.
  const regionMatchers = await buildRegionCityMatchers();
  if (regionMatchers.size === 0) {
    console.error("604Now scrape skipped: no active region has any city-tagged venue.");
    return { inserted: 0 };
  }

  const rawParsed = await fetchUpcomingEvents();

  const parsed = rawParsed
    .map((e) => ({
      event: e,
      // Match against city AND venue name together -- a venue's own name
      // occasionally repeats its city ("Langley Events Centre"), which
      // gives matchRegionForLocation more to work with than the bare city
      // field alone on the rare event with no city set.
      regionId: matchRegionForLocation(`${e.locationCity ?? ""} ${e.locationName ?? ""}`, regionMatchers),
    }))
    .filter((e): e is { event: ParsedEvent; regionId: number } => e.regionId !== null);

  // Active only, keyed by region too -- same reasoning as Castanet/NowMedia:
  // a deactivated venue's events would otherwise silently vanish from public
  // listings, and a same-named venue in two regions can't cross-attach.
  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(
    knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id])
  );

  // Same refresh strategy as Castanet/NowMedia: a short rolling window with
  // no stable IDs of its own on our side, so wipe this source's previous rows
  // and insert the fresh set. Guard against an empty result BEFORE deleting --
  // an upstream outage or API change returning [] must not wipe a
  // previously-good feed.
  if (parsed.length === 0) return { inserted: 0 };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(events).where(like(events.extractionNotes, `${SOURCE_TAG}%`));
    await tx.insert(events).values(
      parsed.map(({ event: e, regionId }) => {
        const matchedVenueId = e.locationName
          ? venueByRegionAndName.get(`${regionId}|${e.locationName.toLowerCase()}`) ?? null
          : null;
        return {
          venueId: matchedVenueId,
          regionId,
          locationName: matchedVenueId ? null : e.locationName,
          locationAddress: matchedVenueId ? null : e.locationCity,
          title: e.title,
          description: e.description,
          eventType: classifyEventType(e.title, e.description ?? ""),
          dayOfWeek: null,
          specificDate: e.specificDate,
          startTime: e.startTime,
          endTime: e.endTime,
          coverChargeCents: e.coverChargeCents,
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
