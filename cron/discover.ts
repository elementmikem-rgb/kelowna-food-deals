import * as cheerio from "cheerio";
import { isAllowedByRobots } from "./fetch";
import { rateLimit } from "./rateLimit";

const USER_AGENT = "KelownaSpecialsBot/1.0 (+https://kelownafooddeals.shop)";

// Matches against both the URL path and the link's own visible text -- a
// venue's "View Menu" button often points at an opaque share-link slug
// (e.g. a Canva view URL) with no keyword in the path itself, so text-only
// matching would miss it.
const KEYWORD_RE = /special|happy[-\s]?hour|promo|deal|event|calendar|whats?-?on|menu/i;

// Platforms we already know need a logged-in, manually-driven session (see
// the claude-in-chrome sweep) -- not something this unattended nightly
// fetch can read, so don't bother storing them as scrape targets.
const SKIP_DOMAINS = /facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com|linkedin\.com/i;

const MAX_DISCOVERED = 5;

async function safeFetchText(url: string): Promise<string | null> {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) return null;
  try {
    await rateLimit();
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function toAbsolute(raw: string, origin: string): string | null {
  try {
    const u = new URL(raw, origin);
    // Some venue sites have their own templating bugs that concatenate two
    // full URLs into one href (seen live: an actual production page's
    // href="https://https://a.com/xoo.com/y"). The WHATWG URL parser eats
    // "https://" a second time as if it were the host, so the result comes
    // back as hostname "https" with the real target buried in the path --
    // a link that will never resolve. A bare "http"/"https" hostname is
    // never a real domain, so treat it the same as an unparseable URL.
    if (u.hostname === "https" || u.hostname === "http") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// requireSameOrigin is true for sitemap-derived URLs (a sitemap only ever
// lists the site's own pages, so this is just a defensive check) and false
// for links found on the venue's own homepage -- a LOT of venues host their
// real menu/happy-hour pricing on a third-party ordering platform under a
// completely different domain (e.g. Browns Socialhouse's own "Social Hour"
// menu lives at browns.xdineapp.com, not brownssocialhouse.com). Restricting
// to same-origin would silently miss exactly the pages we're looking for.
function isCandidate(
  absUrl: string,
  linkText: string,
  origin: string,
  requireSameOrigin: boolean
): boolean {
  let u: URL;
  try {
    u = new URL(absUrl);
  } catch {
    return false;
  }
  if (requireSameOrigin && u.origin !== origin) return false;
  if (SKIP_DOMAINS.test(u.href)) return false;
  return KEYWORD_RE.test(u.pathname) || KEYWORD_RE.test(linkText);
}

async function fromSitemap(origin: string): Promise<string[]> {
  const xml = await safeFetchText(`${origin}/sitemap.xml`);
  if (!xml) return [];
  const $ = cheerio.load(xml, { xmlMode: true });
  const locs = $("loc")
    .map((_, el) => $(el).text().trim())
    .get();

  // A sitemap INDEX points at other sitemaps rather than pages -- follow one
  // level deep (capped at 3) so a venue whose sitemap is split still gets
  // discovered, without recursing indefinitely.
  const subSitemaps = locs.filter((l) => /sitemap.*\.xml$/i.test(l)).slice(0, 3);
  const pageLocs = locs.filter((l) => !/sitemap.*\.xml$/i.test(l));

  const nested = await Promise.all(subSitemaps.map((sm) => safeFetchText(sm)));
  for (const subXml of nested) {
    if (!subXml) continue;
    const $$ = cheerio.load(subXml, { xmlMode: true });
    pageLocs.push(...$$("loc").map((_, el) => $$(el).text().trim()).get());
  }

  return pageLocs;
}

// Takes the venue's actual given URL, not just its origin -- a multi-location
// chain's own site root (e.g. brownssocialhouse.com/) is often a generic
// landing page with no ordering/menu button, while the venue's specific
// location page (brownssocialhouse.com/harvey) is the one with it. Fetching
// only the bare origin silently missed exactly this case in testing.
async function fromHomepageLinks(pageUrl: string): Promise<{ url: string; text: string }[]> {
  const html = await safeFetchText(pageUrl);
  if (!html) return [];
  const $ = cheerio.load(html);
  return $("a[href]")
    .map((_, el) => ({
      url: $(el).attr("href") ?? "",
      text: $(el).text().trim(),
    }))
    .get()
    .filter((l) => l.url);
}

/**
 * Finds candidate pages (specials/happy-hour/events/full-menu) linked from a
 * venue's own site that the nightly scraper isn't already reading. Run
 * weekly (see index.ts), not nightly -- a site's own link structure rarely
 * changes night to night and this is pure discovery overhead, no extraction.
 *
 * Known limitation: some venues host their menu on a third-party "view"
 * page (Canva, Issuu, flipbook PDF viewers) that renders as an image/canvas
 * with no real text nodes. Discovery will still find and store the link,
 * but the nightly fetch may come back empty for it -- that's a page-content
 * problem, not a discovery bug, and would need OCR to fix (not built).
 */
export async function discoverVenueLinks(
  websiteUrl: string,
  alreadyKnown: string[]
): Promise<string[]> {
  let origin: string;
  try {
    origin = new URL(websiteUrl).origin;
  } catch {
    return [];
  }

  const [sitemapLocs, homepageLinks] = await Promise.all([
    fromSitemap(origin),
    fromHomepageLinks(websiteUrl),
  ]);

  const candidates: { url: string; text: string; requireSameOrigin: boolean }[] = [
    ...sitemapLocs.map((url) => ({ url, text: "", requireSameOrigin: true })),
    ...homepageLinks.map((l) => ({ ...l, requireSameOrigin: false })),
  ];

  const known = new Set(alreadyKnown.map((u) => u.trim()));
  const found = new Set<string>();

  for (const { url: raw, text, requireSameOrigin } of candidates) {
    const abs = toAbsolute(raw, origin);
    if (!abs) continue;
    if (!isCandidate(abs, text, origin, requireSameOrigin)) continue;
    if (known.has(abs)) continue;
    found.add(abs);
    if (found.size >= MAX_DISCOVERED) break;
  }

  return Array.from(found);
}

export function isAutomatableUrl(url: string): boolean {
  return !SKIP_DOMAINS.test(url);
}
