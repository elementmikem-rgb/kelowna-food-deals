// Shared geocoding helper for region and venue seeding. Nominatim
// (OpenStreetMap) is free but rate-limited to ~1 req/sec and requires a real
// User-Agent identifying the app per its usage policy -- callers must await
// each call in sequence (never Promise.all a batch) to respect that.
const NOMINATIM_USER_AGENT = "TodaysTab-geocode/1.0 (element.mikem@gmail.com)";

export interface LatLng {
  lat: number;
  lng: number;
}

export async function geocode(query: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat: string; lon: string }[];
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const PROVINCE_FULL_NAME: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
};

// Strips a trailing "#125" / "Unit 121" suite marker from a street segment, and drops
// any other comma-separated segment that's purely a unit/suite descriptor (e.g. a Google
// Places formatted address like "208 Barclay Parade SW, Market #200, Calgary, ..." --
// Nominatim can resolve the building, never the suite inside it).
function stripUnit(address: string): string {
  const parts = address.split(",").map((p) => p.trim());
  return parts
    .filter((p, i) => i === 0 || !(p.includes("#") || /^(unit|suite|ste\.?)\b/i.test(p)))
    .map((p, i) =>
      i === 0
        ? p
            .replace(/\s*#\s*[\w-]+$/, "")
            .replace(/\s+Unit\s+[\w-]+$/i, "")
            .replace(/\s+(Unit|Suite|Ste\.?)$/i, "") // leftover bare "unit"/"suite" after the "#123" strip above
        : p
    )
    .join(", ");
}

// Drops the postal code and expands a 2-letter province code to its full name --
// Nominatim's free-text search is noticeably less reliable WITH a Canadian postal code
// attached than without one, and "AB"/"ON"/etc. sometimes misses where "Alberta"/
// "Ontario" hits. Discovered empirically against real Place Details addresses that
// failed to geocode as-is (2026-10-07) -- not documented anywhere, just how Nominatim
// behaves in practice.
function dropPostalExpandProvince(address: string): string {
  let result = address.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/, "").replace(/,\s*,/g, ",");
  for (const [abbr, full] of Object.entries(PROVINCE_FULL_NAME)) {
    result = result.replace(new RegExp(`\\b${abbr}\\b`), full);
  }
  return result.replace(/\s+,/g, ",").trim();
}

// Three-tier retry: the address as given, then with suite/unit markers stripped, then
// with the postal code dropped and province abbreviation expanded. Each tier only runs
// if the previous one returned nothing, so a normal address still costs exactly one
// Nominatim call -- this only spends extra calls on addresses that actually need it.
export async function geocodeWithFallbacks(address: string): Promise<LatLng | null> {
  const direct = await geocode(address);
  if (direct) return direct;

  await sleep(GEOCODE_DELAY_MS);
  const unitStripped = stripUnit(address);
  if (unitStripped !== address) {
    const r = await geocode(unitStripped);
    if (r) return r;
  }

  await sleep(GEOCODE_DELAY_MS);
  const expanded = dropPostalExpandProvince(unitStripped);
  if (expanded !== unitStripped) {
    const r = await geocode(expanded);
    if (r) return r;
  }

  return null;
}

// Call this between every geocode() call in a loop -- Nominatim's usage
// policy caps free requests at ~1/sec.
export const GEOCODE_DELAY_MS = 1100;
