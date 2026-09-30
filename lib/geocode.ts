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

// Call this between every geocode() call in a loop -- Nominatim's usage
// policy caps free requests at ~1/sec.
export const GEOCODE_DELAY_MS = 1100;
