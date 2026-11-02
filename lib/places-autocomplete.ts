// Address suggestions for the "submit a venue" form, from Google Places Autocomplete (New).
// The browser never sees the API key: it calls /api/places/autocomplete, which calls Google.
// Billing: "Autocomplete Requests" has 10,000 free calls a month (then $2.83 per 1,000), so the route
// is rate limited per visitor and the form only asks after 3 characters and a short pause.

export interface AddressSuggestion {
  placeId: string;
  text: string;
  main: string;
  secondary: string;
}

/** Trim, collapse whitespace; null when too short to be worth a paid call, or absurdly long. */
export function normalizeAutocompleteQuery(q: string | null | undefined): string | null {
  if (!q) return null;
  const s = q.replace(/\s+/g, " ").trim();
  return s.length >= 3 && s.length <= 120 ? s : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidSessionToken(t: string | null | undefined): boolean {
  return !!t && UUID.test(t);
}

export function buildAutocompleteBody(input: string, sessionToken: string) {
  return { input, sessionToken, includedRegionCodes: ["ca"], languageCode: "en" };
}

export const AUTOCOMPLETE_FIELD_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat";

/** Google's response -> at most 5 plain place suggestions. Anything unexpected gives []. */
export function parseAutocompleteResponse(json: unknown): AddressSuggestion[] {
  const list = (json as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(list)) return [];
  const out: AddressSuggestion[] = [];
  for (const item of list) {
    type Prediction = {
      placeId?: unknown;
      text?: { text?: unknown };
      structuredFormat?: { mainText?: { text?: unknown }; secondaryText?: { text?: unknown } };
    };
    const p = (item as { placePrediction?: Prediction } | null)?.placePrediction;
    const placeId = p?.placeId;
    const text = p?.text?.text;
    if (typeof placeId !== "string" || typeof text !== "string") continue;
    const main = p?.structuredFormat?.mainText?.text;
    const secondary = p?.structuredFormat?.secondaryText?.text;
    out.push({
      placeId,
      text,
      main: typeof main === "string" ? main : text,
      secondary: typeof secondary === "string" ? secondary : "",
    });
    if (out.length === 5) break;
  }
  return out;
}
