import type { SpecialWithVenue } from "./data";
import { todayDowPacific, isStale } from "./time";

const MAX_JSONLD_ITEMS = 80;

export function buildSpecialsJsonLd(specials: SpecialWithVenue[]) {
  const today = todayDowPacific();
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
    name: "Kelowna Food and Drink Specials",
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
            // This site covers four towns; hardcoding Kelowna mislabeled every
            // West Kelowna / Lake Country / Peachland venue in local-SEO signals.
            addressLocality: s.venueCity ?? "Kelowna",
            addressRegion: "BC",
            addressCountry: "CA",
          },
        },
      },
    })),
  };
}
