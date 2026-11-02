// Google Maps links for a venue. With a Google place ID (venues.google_place_id) every link opens the
// exact place; without one they fall back to a text search, which can land on the wrong business.
// These URLs and the keyless embed cost nothing. The keyed Embed API is also free and unlimited, but
// it needs a public browser key (NEXT_PUBLIC_GOOGLE_EMBED_KEY) locked to the Embed API and our domains.

type VenueRef = { name: string; address: string; googlePlaceId?: string | null };

export function mapsDirectionsUrl(v: VenueRef): string {
  if (v.googlePlaceId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name)}&query_place_id=${v.googlePlaceId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`;
}

export function mapsReviewsUrl(v: VenueRef, areaName: string): string {
  if (v.googlePlaceId) return `https://search.google.com/local/reviews?placeid=${v.googlePlaceId}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${v.name} ${areaName} reviews`)}`;
}

export function mapsWriteReviewUrl(googlePlaceId: string | null | undefined): string | null {
  return googlePlaceId ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}` : null;
}

// For schema.org `hasMap`.
export function mapsPlaceUrl(googlePlaceId: string | null | undefined): string | null {
  return googlePlaceId ? `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}` : null;
}

export function mapsEmbedUrl(opts: { address: string; googlePlaceId?: string | null; embedKey?: string }): string {
  if (opts.embedKey && opts.googlePlaceId) {
    return `https://www.google.com/maps/embed/v1/place?key=${opts.embedKey}&q=place_id:${opts.googlePlaceId}`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(opts.address)}&output=embed`;
}

const PROVINCE_WORDS: Record<string, string> = {
  "british columbia": "BC", alberta: "AB", saskatchewan: "SK", manitoba: "MB", ontario: "ON", quebec: "QC",
  "québec": "QC", "new brunswick": "NB", "nova scotia": "NS", "prince edward island": "PE",
  "newfoundland and labrador": "NL", yukon: "YT", "northwest territories": "NT", nunavut: "NU",
};
const PROVINCE_CODES = new Set(Object.values(PROVINCE_WORDS));

/** "…, Squamish, BC V0N 1T0" -> "BC". Returns undefined when the address carries no province. */
export function provinceFromAddress(address: string): string | undefined {
  const parts = address.split(",").map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const lower = part.toLowerCase();
    // "Ontario", "Saskatchewan" (full name, maybe followed by a postal code)
    for (const [word, code] of Object.entries(PROVINCE_WORDS)) {
      if (lower === word || lower.startsWith(word + " ")) return code;
    }
    // "BC V0N 1T0" or just "ON"
    const m = part.match(/^([A-Z]{2})(?:\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d)?$/);
    if (m && PROVINCE_CODES.has(m[1])) return m[1];
  }
  return undefined;
}
