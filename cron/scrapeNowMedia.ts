import * as cheerio from "cheerio";
import { db, events, venues, regions } from "@/db";
import { eq, like } from "drizzle-orm";
import { openBrowserSession, type BrowserSession } from "./fetch";
import { classifyEventType, parseCoverCharge, decodeEntities } from "./eventClassify";

const SOURCE_TAG = "source:nowmedia";

// Both kelownafooddeals.shop's Kelowna and Penticton regions have a NowMedia
// "...Now.com" local news site with an identical events platform (same URL
// shape, same category taxonomy) -- one shared scraper, one row per site,
// rather than a bespoke scraper per region.
interface NowMediaSite {
  regionSlug: string;
  baseUrl: string;
}
const SITES: NowMediaSite[] = [
  { regionSlug: "kelowna", baseUrl: "https://www.kelownanow.com" },
  { regionSlug: "penticton", baseUrl: "https://www.pentictonnow.com" },
];

// Nightlife-adjacent only, same spirit as Castanet's own category allowlist --
// spelled exactly as this platform renders them in its own event URLs
// (/events/events/{CategorySlug}/{yy}/{mm}/{dd}/{id}/{title-slug}).
const ALLOWED_CATEGORY_SLUGS = new Set([
  "Bars_Pubs_and_Clubs",
  "Comedy",
  "Concerts",
  "Dances",
  "Live_Music",
  "Trivia_Gaming_Events",
  "Wine_and_Ale",
]);

// A short, bounded crawl: this only cares about what's coming up soon, not a
// venue's entire future calendar, and stopping once a page has zero listing
// links (rather than a fixed count) means it doesn't hammer a nearly-empty
// tail of pagination on a quiet week either.
const MAX_LISTING_PAGES = 4;

const EVENT_URL_RE = /^\/events\/events\/([A-Za-z_]+)\/(\d{2})\/(\d{2})\/(\d{2})\/(\d+)\/([^/]+)$/;

interface ListingLink {
  url: string;
  title: string;
  categorySlug: string;
  specificDate: string; // YYYY-MM-DD, parsed straight from the URL's own date segments
}

interface ParsedNowMediaEvent {
  title: string;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  specificDate: string;
  startTime: string | null;
  endTime: string | null;
  sourceUrl: string;
}

// A plain server-side fetch gets a 403 from this platform (bot-protection
// keyed on browser fingerprint, not just User-Agent) -- every request goes
// through a real headless browser, reusing one session (see openBrowserSession)
// across all requests to the same site so a Cloudflare challenge only has to
// clear once, not on every single page.
async function safeFetch(session: BrowserSession, url: string): Promise<string | null> {
  const result = await session.fetchHtml(url);
  if (!result.ok) {
    console.error(`NowMedia fetch failed for ${url}: ${result.error}`);
    return null;
  }
  return result.html;
}

// Every listing card wraps the same href in more than one <a> (the photo,
// the title, and a "More Information" button), so this must dedupe by URL
// itself -- not just against URLs seen on earlier pages -- and needs to pick
// the real title out of that set rather than whichever anchor happens first,
// since the generic button text is a real, common value here, not a rare edge
// case (verified: it showed up for the majority of events in a real run).
const GENERIC_LINK_TEXT = /^(more information|read more|click here|details?)$/i;

function parseListingLinks(html: string, baseUrl: string): ListingLink[] {
  const $ = cheerio.load(html);
  const byUrl = new Map<string, { title: string; categorySlug: string; specificDate: string }>();

  $('a[href^="/events/events/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const match = EVENT_URL_RE.exec(href);
    if (!match) return;
    const title = $(el).text().trim();
    if (!title) return;
    const [, categorySlug, yy, mm, dd] = match;
    const url = `${baseUrl}${href}`;

    const existing = byUrl.get(url);
    // Prefer a non-generic title, then the longer one -- a real event title
    // is never shorter than "More Information" in practice.
    const currentIsGeneric = existing ? GENERIC_LINK_TEXT.test(existing.title) : false;
    const newIsGeneric = GENERIC_LINK_TEXT.test(title);
    if (!existing || (currentIsGeneric && !newIsGeneric) || (currentIsGeneric === newIsGeneric && title.length > existing.title.length)) {
      byUrl.set(url, { title: decodeEntities(title), categorySlug, specificDate: `20${yy}-${mm}-${dd}` });
    }
  });

  return Array.from(byUrl.entries()).map(([url, v]) => ({ url, ...v }));
}

function hasNextPage(html: string): boolean {
  return /href="\/events\/page:\d+"/.test(html);
}

// Each event's own detail page renders an "Add to Calendar" widget with
// clean, purpose-built <var class="atc_..."> fields -- exact start/end
// datetime and the full (untruncated) description, verified against a real
// page's actual markup. Far more reliable than guessing at prose paragraphs,
// which this page also has plenty of for unrelated site chrome (login
// modal, etc) that a generic "longest paragraph" heuristic can latch onto.
function parseAtcTime(raw: string | undefined): string | null {
  // "2026-09-10 17:00:00" -> "17:00"
  if (!raw) return null;
  const match = raw.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2}):\d{2}/);
  return match ? match[1] : null;
}

async function fetchEventDetail(session: BrowserSession, link: ListingLink): Promise<ParsedNowMediaEvent | null> {
  const html = await safeFetch(session, link.url);
  if (!html) return null;
  const $ = cheerio.load(html);

  const atc = $("var.atc_event").first();
  const description = atc.find(".atc_description").first().text().trim() || null;
  const startTime = parseAtcTime(atc.find(".atc_date_start").first().text().trim());
  const endTime = parseAtcTime(atc.find(".atc_date_end").first().text().trim());

  // Location/Address still come from the separate summary paragraph (atc_location
  // concatenates name+address with no reliable delimiter to split them back apart).
  // A one-off event with no tracked venue simply omits this paragraph -- both stay
  // null in that case, same as the Castanet scraper's own no-match behavior.
  const infoP = $("p")
    .filter((_, el) => $(el).text().trim().startsWith("Location:"))
    .first();
  let locationName: string | null = null;
  let locationAddress: string | null = null;
  if (infoP.length > 0) {
    const anchors = infoP.find("a");
    locationName = anchors.eq(0).text().trim() || null;
    locationAddress = anchors.eq(1).text().trim() || null;
  }

  return {
    title: link.title,
    description: description ? decodeEntities(description) : null,
    locationName,
    locationAddress,
    specificDate: link.specificDate,
    startTime,
    endTime,
    sourceUrl: link.url,
  };
}

export async function scrapeNowMediaEvents(): Promise<{ inserted: number }> {
  const activeRegions = await db.select().from(regions).where(eq(regions.active, true));
  const regionIdBySlug = new Map(activeRegions.map((r) => [r.slug, r.id]));

  const parsed: { event: ParsedNowMediaEvent; regionId: number }[] = [];

  for (const site of SITES) {
    const regionId = regionIdBySlug.get(site.regionSlug);
    if (regionId === undefined) continue; // region not active/seeded yet -- skip, don't guess

    // One browser session per site: every listing page and every matched
    // event's detail page for this site reuses the same context/cookies, so
    // a Cloudflare challenge only has to clear once per site, not per page.
    const session = await openBrowserSession();
    try {
      const seenUrls = new Set<string>();
      for (let page = 1; page <= MAX_LISTING_PAGES; page++) {
        const listingUrl = page === 1 ? `${site.baseUrl}/events/` : `${site.baseUrl}/events/page:${page}`;
        const html = await safeFetch(session, listingUrl);
        if (!html) break;

        const links = parseListingLinks(html, site.baseUrl).filter(
          (l) => ALLOWED_CATEGORY_SLUGS.has(l.categorySlug) && !seenUrls.has(l.url)
        );
        for (const link of links) {
          seenUrls.add(link.url);
          const detail = await fetchEventDetail(session, link);
          if (detail) parsed.push({ event: detail, regionId });
        }

        if (!hasNextPage(html)) break;
      }
    } finally {
      await session.close();
    }
  }

  // Active only: matching to a deactivated venue attaches the event to a venue
  // the public listings filter out, so the event silently vanishes instead of
  // falling back to its own locationName/locationAddress. Keyed by region too,
  // not just name, so a same-named venue in two regions can't cross-attach.
  const knownVenues = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(eq(venues.active, true));
  const venueByRegionAndName = new Map(
    knownVenues.map((v) => [`${v.regionId}|${v.name.trim().toLowerCase()}`, v.id])
  );

  // Same refresh strategy as Castanet: this only ever reflects a short rolling
  // window (whatever's on the first few listing pages right now), so wipe the
  // previous run's rows and insert the fresh set rather than diffing against a
  // source with no stable IDs of its own. Guard against an empty result BEFORE
  // deleting -- an upstream outage or markup change returning [] must not wipe
  // out a previously-good feed.
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
          locationAddress: matchedVenueId ? null : e.locationAddress,
          title: e.title,
          description: e.description,
          eventType: classifyEventType(e.title, e.description ?? ""),
          dayOfWeek: null,
          specificDate: e.specificDate,
          startTime: e.startTime,
          endTime: e.endTime,
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
