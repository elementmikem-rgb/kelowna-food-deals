import type { SpecialWithVenue } from "./data";
import { todayDowPacific, isStale } from "./time";

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
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Kelowna Food and Drink Specials",
    itemListElement: runningToday.map((s, i) => ({
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
            addressLocality: "Kelowna",
            addressRegion: "BC",
            addressCountry: "CA",
          },
        },
      },
    })),
  };
}
