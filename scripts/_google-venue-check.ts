// Read-only check of venues against Google Places (Text Search, Pro-tier fields only: no ratings, hours, phone).
// For each venue linked from a blog guide it reports: Google's businessStatus (closed or temporarily closed),
// whether Google's street number and name agree with ours, and how far Google's location is from ours.
// It writes NOTHING to the database. Output is a JSON report for a person to review.
//
//   PLACES_KEY_FILE=<path> npx tsx --env-file=.env.local scripts/_google-venue-check.ts <out.json> [--limit N]
// Free cap: Text Search Pro is 5,000 calls per calendar month. Stops at --limit (default 600).
import { readFileSync, writeFileSync } from "fs";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const outPath = process.argv[2];
if (!outPath) throw new Error("usage: _google-venue-check.ts <out.json> [--limit N]");
const li = process.argv.indexOf("--limit");
const LIMIT = li > 0 ? Number(process.argv[li + 1]) : 600;
const keyFile = process.env.PLACES_KEY_FILE;
if (!keyFile) throw new Error("set PLACES_KEY_FILE");
const KEY = readFileSync(keyFile, "utf8").trim();

const STOP = new Set(["the", "a", "and", "of", "co", "inc", "ltd", "restaurant", "resto", "bistro", "bar", "grill", "pub", "lounge", "house", "eatery", "cafe", "kitchen", "tavern", "public", "social", "downtown", "sports"]);
const nums = (s: string) => (s.match(/\d+/g) ?? []).filter((n) => n.length >= 2);
const toks = (s: string) =>
  new Set(s.replace(/\([^)]*\)/g, " ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t)));
function nameAgrees(a: string, b: string) {
  const ta = toks(a), tb = toks(b);
  for (const t of ta) if (tb.has(t)) return true;
  return ta.size === 0 && tb.size === 0;
}
function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371, d = Math.PI / 180;
  const x = Math.sin(((bLat - aLat) * d) / 2) ** 2 + Math.cos(aLat * d) * Math.cos(bLat * d) * Math.sin(((bLng - aLng) * d) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function main() {
  // Default: every venue linked from a blog guide. Or pass --ids 12,34,56 for a specific list.
  const idsArg = process.argv.indexOf("--ids");
  const blog = readFileSync("lib/blog-data.ts", "utf8");
  const ids = idsArg > 0
    ? process.argv[idsArg + 1].split(",").map(Number)
    : [...new Set([...blog.matchAll(/\/venues\/(\d+)"/g)].map((m) => Number(m[1])))];
  const venues = (await db.execute(sql`
    SELECT v.id, v.name, v.address, v.city, v.lat, v.lng, v.approx_coords, v.active, g.slug AS region
    FROM specials.venues v JOIN specials.regions g ON g.id = v.region_id
    WHERE v.id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND v.address IS NOT NULL
    ORDER BY v.id`)) as unknown as Array<{ id: number; name: string; address: string; city: string | null; lat: number | null; lng: number | null; approx_coords: boolean; active: boolean; region: string }>;
  console.log(`${ids.length} venues linked from guides, ${venues.length} with an address; checking up to ${LIMIT}.`);

  const report: any[] = [];
  let calls = 0;
  for (const v of venues) {
    if (calls >= LIMIT) { console.log("limit reached"); break; }
    calls++;
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus" },
      body: JSON.stringify({ textQuery: `${v.name}, ${v.address}, ${v.city ?? ""}` }),
    });
    if (!res.ok) {
      console.log(`HTTP ${res.status} on venue ${v.id}, stopping (no retry).`);
      report.push({ id: v.id, name: v.name, region: v.region, result: "api-error", status: res.status });
      break;
    }
    const p = ((await res.json()) as any).places?.[0];
    if (!p) { report.push({ id: v.id, name: v.name, region: v.region, result: "no-google-result" }); continue; }
    const theirs = new Set(nums(p.formattedAddress ?? ""));
    const streetOk = nums(v.address).some((n) => theirs.has(n));
    const nameOk = nameAgrees(v.name, p.displayName?.text ?? "");
    const distKm = v.lat != null && v.lng != null && p.location ? km(v.lat, v.lng, p.location.latitude, p.location.longitude) : null;
    report.push({
      id: v.id, name: v.name, region: v.region, address: v.address, active: v.active,
      googleName: p.displayName?.text, googleAddress: p.formattedAddress, businessStatus: p.businessStatus ?? null,
      matched: streetOk && nameOk, streetOk, nameOk, approxCoords: v.approx_coords,
      distanceKm: distKm == null ? null : Math.round(distKm * 1000) / 1000,
      googleLat: p.location?.latitude, googleLng: p.location?.longitude,
    });
    if (calls % 100 === 0) console.log(`  ${calls} checked`);
  }
  writeFileSync(outPath, JSON.stringify(report, null, 1));
  const m = report.filter((r) => r.matched);
  console.log(`DONE calls=${calls} matched=${m.length} unmatched=${report.length - m.length}`);
  console.log(`  closed permanently: ${m.filter((r) => r.businessStatus === "CLOSED_PERMANENTLY").length}, temporarily: ${m.filter((r) => r.businessStatus === "CLOSED_TEMPORARILY").length}`);
  console.log(`  location more than 300 m from ours (matched): ${m.filter((r) => r.distanceKm != null && r.distanceKm > 0.3).length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
