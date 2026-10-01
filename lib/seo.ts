import type { SpecialWithVenue } from "./data";
import type { EventWithVenue } from "./events-data";
import { todayDowInRegion, regionTodayISODate, addDaysISO, isStale } from "./time";

const MAX_JSONLD_ITEMS = 80;

// Same construction as app/sitemap.ts's SITE_URL -- duplicated rather than imported
// since sitemap.ts is a route module, not a lib one.
export const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

export function buildSpecialsJsonLd(
  specials: SpecialWithVenue[],
  regionName: string,
  timezone: string,
  // "BC", "AB", "ON", etc. -- was hardcoded to "BC" for every region until
  // 2026-10-02, silently mislabeling the province for every special outside BC
  // once the platform expanded past its original single-province footprint.
  // Callers already have this from getRegionContext(region).province.code.
  provinceCode: string,
  // Locks the "today" the structured data describes -- passed by the /[region]/
  // [day] SEO pages, which show a specific day rather than whatever day it is
  // right now (see SpecialsBoard's initialDay). Defaults to the real today for
  // every other call site (the home page), unchanged from before.
  dayOverride?: number
) {
  const today = dayOverride ?? todayDowInRegion(timezone);
  // The page only ever shows today's specials (SpecialsBoard filters by day), so the
  // structured data must match: publishing every day-of-week's specials as InStock every
  // day told crawlers something the rendered page didn't say, and kept advertising specials
  // as available long past the point the UI itself greys them out as stale.
  const runningToday = specials.filter(
    (s) =>
      (s.dayOfWeek === null || s.dayOfWeek === today || s.isMonthly) &&
      !isStale(s.lastVerifiedAt)
  );
  // The full list serialized to ~47KB of the homepage's raw HTML on a busy night.
  // A representative sample carries the same signal at a fraction of the payload.
  const listed = runningToday.slice(0, MAX_JSONLD_ITEMS);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${regionName} Food and Drink Specials`,
    numberOfItems: runningToday.length,
    itemListElement: listed.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Offer",
        name: s.title,
        description: s.description ?? undefined,
        price: s.priceCents !== null ? (s.priceCents / 100).toFixed(2) : undefined,
        priceCurrency: s.priceCents !== null ? "CAD" : undefined,
        availability: "https://schema.org/InStock",
        offeredBy: {
          "@type": "FoodEstablishment",
          name: s.venueName,
          address: {
            "@type": "PostalAddress",
            // Each region covers multiple towns; hardcoding one mislabeled every
            // venue in a different sub-area in local-SEO signals.
            addressLocality: s.venueCity ?? regionName.split(" ")[0],
            addressRegion: provinceCode,
            addressCountry: "CA",
          },
        },
      },
    })),
  };
}

// Specials already got structured data (ItemList/Offer above); events had none at
// all until 2026-10-02 despite being an equally core feature (live music, trivia,
// karaoke, sports nights) -- this is the same pattern applied to the second content
// type, so both are equally visible to rich-result-eligible crawlers and AI answer
// engines citing structured data over plain text.
export function buildEventsJsonLd(
  events: EventWithVenue[],
  regionName: string,
  timezone: string,
  provinceCode: string,
  // Injectable for tests (same pattern as time.ts's regionTodayISODate/
  // todayDowInRegion default `now` param) -- every real caller omits these and gets
  // the actual current date.
  now: Date = new Date()
) {
  const todayISO = regionTodayISODate(timezone, now);
  const todayDow = todayDowInRegion(timezone, now);

  const upcoming = events.filter((e) => !isStale(e.lastVerifiedAt));
  const listed = upcoming.slice(0, MAX_JSONLD_ITEMS);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${regionName} Live Music & Events`,
    numberOfItems: upcoming.length,
    itemListElement: listed
      .map((e, i) => {
        // schema.org/Event wants one concrete date, not a weekly recurrence rule --
        // a one-off event already has specificDate; a recurring weekly event (e.g.
        // "Trivia every Tuesday") gets the SOONEST upcoming occurrence of that
        // weekday, same simplification most sites make for structured data (the
        // page's own copy still says "every Tuesday" for a human reader).
        const date =
          e.specificDate ?? (e.dayOfWeek !== null ? addDaysISO(todayISO, (e.dayOfWeek - todayDow + 7) % 7) : null);
        if (date === null) return null; // defensive -- extraction rules require one of these to be set
        const startDate = e.startTime ? `${date}T${e.startTime}:00` : date;

        return {
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Event",
            name: e.title,
            description: e.description ?? undefined,
            startDate,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            location: {
              "@type": "Place",
              name: e.venueName,
              address: {
                "@type": "PostalAddress",
                addressLocality: regionName.split(" ")[0],
                addressRegion: provinceCode,
                addressCountry: "CA",
              },
            },
            offers:
              e.coverChargeCents !== null
                ? {
                    "@type": "Offer",
                    price: (e.coverChargeCents / 100).toFixed(2),
                    priceCurrency: "CAD",
                    availability: "https://schema.org/InStock",
                  }
                : undefined,
          },
        };
      })
      .filter((item) => item !== null),
  };
}

// BreadcrumbList schema -- eligible for Google's breadcrumb rich result, which
// replaces the raw URL in search results with a clickable path (Home > Region >
// Page). Takes already-built {name, path} crumbs rather than deriving them, since
// each landing page (day/category/event-type) has its own label/slug logic already
// resolved by the time it builds this.
export function buildBreadcrumbJsonLd(siteUrl: string, crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.path}`,
    })),
  };
}

// FAQPage schema -- Google only honours this for content that's actually visible
// on the page (FAQSection renders the same q/a pairs), not for hidden markup. Takes
// the already-translated items from lib/i18n.ts's faq.items so the schema and the
// visible text can never drift out of sync with each other.
export function buildFaqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
