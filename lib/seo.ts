import type { SpecialWithVenue } from "./data";

export function buildSpecialsJsonLd(specials: SpecialWithVenue[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Kelowna Food and Drink Specials",
    itemListElement: specials.map((s, i) => ({
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
