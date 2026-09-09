import * as cheerio from "cheerio";
import { db, events, venues } from "@/db";
import { eq, like, isNotNull, and } from "drizzle-orm";
import { isAllowedByRobots } from "./fetch";
import { rateLimit } from "./rateLimit";
import { classifyEventType, parseCoverCharge, decodeEntities, pacificToday } from "./eventClassify";

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

// One matcher per active region, built from that region's own active venues'
// city names (e.g. Kelowna -> kelowna/west kelowna/peachland/lake country;
// Penticton -> penticton/naramata/oliver/osoyoos/summerland) -- not a single
// hardcoded list, so a Castanet event gets attributed to whichever region it's
// actually in, and a newly added satellite town is picked up automatically the
// next time this runs, with no code change needed.
async function buildRegionCityMatchers(): Promise<Map<number, RegExp>> {
  const rows = await db
    .selectDistinct({ regionId: venues.regionId, city: venues.city })
    .from(venues)
    .where(and(eq(venues.active, true), isNotNull(venues.city)));

  const citiesByRegion = new Map<number, Set<string>>();
  for (const row of rows) {
    if (!row.city) continue;
    const set = citiesByRegion.get(row.regionId) ?? new Set<string>();
    set.add(row.city.toLowerCase());
    citiesByRegion.set(row.regionId, set);
  }

  const matchers = new Map<number, RegExp>();
  for (const [regionId, cities] of citiesByRegion) {
    if (cities.size === 0) continue;
    const escaped = Array.from(cities).map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    matchers.set(regionId, new RegExp(`\\b(${escaped.join("|")})\\b`, "i"));
  }
  return matchers;
}

// Ambiguous (matches more than one region, which shouldn't happen given the
// two regions' city sets don't overlap today) or unmatched (a location Castanet
// listed that isn't any tracked region's city, e.g. Vernon) both return null --
// skip the event rather than guess.
function matchRegionForLocation(
  locationLine: string,
  matchers: Map<number, RegExp>
): number | null {
  let matched: number | null = null;
  for (const [regionId, re] of matchers) {
    if (re.test(locationLine)) {
      if (matched !== null) return null;
      matched = regionId;
    }
  }
  return matched;
}

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
  // Same politeness path every other fetch in this codebase takes (cron/fetch.ts).
  if (!(await isAllowedByRobots(url))) {
    console.error(`Castanet fetch skipped for ${url}: disallowed by robots.txt`);
    return [];
  }
  await rateLimit();
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

    // City/region matching happens later in scrapeCastanetEvents(), once for
    // the whole parsed set, against every active region's own city list --
    // not here against one hardcoded region.
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
  // Castanet event scraping is a GLOBAL/shared step (spec Section 4), not
  // region-scoped -- it runs once per full cron cycle, not once per region.
  // Each parsed event is attributed to whichever active region's own city list
  // (buildRegionCityMatchers) matches its location line; one with no match (or
  // an ambiguous match across regions) is skipped, same as the old single-region
  // filter's behavior for a non-matching city.
  const regionMatchers = await buildRegionCityMatchers();
  if (regionMatchers.size === 0) {
    console.error("Castanet scrape skipped: no active region has any city-tagged venue.");
    return { inserted: 0 };
  }

  // Sequential, not Promise.all: concurrent requests defeat rateLimit()'s
  // serialization and every other fetch in this codebase is one-at-a-time.
  const todayEvents = await fetchAndParse("https://www.castanet.net/events/");
  const weekendEvents = await fetchAndParse("https://www.castanet.net/events/weekend");

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
  const parsedAll = Array.from(new Set(seen.values()));

  const parsed = parsedAll
    .map((e) => ({ event: e, regionId: matchRegionForLocation(e.locationAddress, regionMatchers) }))
    .filter((e): e is { event: ParsedCastanetEvent; regionId: number } => e.regionId !== null);

  // Active only: matching to a deactivated venue attaches the event to a venue
  // the public listings filter out, so the event silently vanishes instead of
  // falling back to its own locationName/locationAddress. Keyed by region too --
  // not just name -- so a franchise with locations in more than one region (e.g.
  // a future same-named venue in both Kelowna and Penticton) can't cross-attach.
  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(
    knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id])
  );

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
      parsed.map(({ event: e, regionId }) => {
        const matchedVenueId =
          venueByRegionAndName.get(`${regionId}|${e.locationName.toLowerCase()}`) ?? null;
        return {
          venueId: matchedVenueId,
          regionId,
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
