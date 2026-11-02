// Google Places photo backfill for venues people actually see: first the venues linked from our
// blog guides, then other photo-less venues that have live specials in regions with a guide.
// Text Search (Pro fields) finds the place; the first photo is fetched once (Place Details Photos
// SKU, 1,000 free calls per calendar month) and stored as source=google, same as the earlier runs.
//
//   npx tsx --env-file=.env.local scripts/_backfill-places-photos-guides.ts             (dry run, no API calls)
//   PLACES_KEY_FILE=<path> npx tsx --env-file=.env.local scripts/_backfill-places-photos-guides.ts --run [--budget 950]
//
// Safety: stops the moment the photo-call budget is spent (counts every photo request, even failed
// ones), never retries a venue, and only accepts a match when the street number AND a name word agree.
import { readFileSync } from "fs";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import sharp from "sharp";

const RUN = process.argv.includes("--run");
const bi = process.argv.indexOf("--budget");
const BUDGET = bi > 0 ? Number(process.argv[bi + 1]) : 950;

const STOP = new Set([
  "the", "a", "and", "of", "co", "inc", "ltd", "restaurant", "resto", "bistro", "bar", "grill", "pub",
  "lounge", "house", "eatery", "cafe", "kitchen", "tavern", "public", "social", "downtown", "sports",
]);
function nums(s: string): string[] {
  return (s.match(/\d+/g) ?? []).filter((n) => n.length >= 2);
}
function tokens(s: string): Set<string> {
  return new Set(
    s
      .replace(/\([^)]*\)/g, " ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}
function nameAgrees(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  for (const t of ta) if (tb.has(t)) return true;
  return ta.size === 0 && tb.size === 0;
}

// Region order = real traffic (30-day sessions with 2+ pageviews, 2026-11-02), Kelowna and Penticton
// first and finished completely. Within a region: venues with live specials first, then the rest.
const REGION_ORDER = [
  "kelowna", "penticton", "revelstoke-golden", "kitchener-waterloo-cambridge", "whistler", "kamloops",
  "durham-region", "vancouver", "halifax", "winnipeg", "barrie-simcoe-county", "saint-john-nb",
  "regina", "london", "edmonton", "mississauga", "peterborough-kawarthas", "hamilton",
];

async function candidates() {
  const rows = (await db.execute(sql`
    SELECT v.id, v.name, v.address, v.city, g.slug AS region,
      (SELECT count(*) FROM specials.specials s WHERE s.venue_id = v.id AND s.archived_at IS NULL)::int AS live
    FROM specials.venues v
    JOIN specials.regions g ON g.id = v.region_id
    WHERE v.active = true AND v.address IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM specials.venue_photos p WHERE p.venue_id = v.id)
  `)) as unknown as Array<{ id: number; name: string; address: string | null; city: string | null; region: string; live: number }>;
  const queue: typeof rows = [];
  const perRegion: Record<string, number> = {};
  for (const slug of REGION_ORDER) {
    const mine = rows.filter((r) => r.region === slug).sort((a, b) => b.live - a.live || a.id - b.id);
    perRegion[slug] = mine.length;
    queue.push(...mine);
  }
  return { queue, perRegion };
}

async function main() {
  const c = await candidates();
  console.log("Photo-less active venues by region, in run order:", JSON.stringify(c.perRegion));
  const queue = c.queue;
  if (!RUN) {
    console.log(`DRY RUN. Would try up to ${queue.length} venues and stop at ${BUDGET} photo calls. Add --run to go.`);
    return;
  }
  const keyFile = process.env.PLACES_KEY_FILE;
  if (!keyFile) throw new Error("set PLACES_KEY_FILE to a file containing the API key");
  const KEY = readFileSync(keyFile, "utf8").trim();

  let photoCalls = 0, searches = 0, saved = 0, noMatch = 0, mismatch = 0, nameMiss = 0, noPhoto = 0, failed = 0;
  for (const v of queue) {
    if (photoCalls >= BUDGET) {
      console.log(`BUDGET REACHED (${photoCalls}/${BUDGET}), stopping.`);
      break;
    }
    searches++;
    const why = (r: string) => { if (v.region === "kelowna" || v.region === "penticton") console.log(`  skip ${v.region} #${v.id} ${v.name} (${v.address}): ${r}`); };
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos",
      },
      body: JSON.stringify({ textQuery: `${v.name}, ${v.address}, ${v.city ?? ""}` }),
    });
    if (!res.ok) {
      failed++;
      if (res.status === 429 || res.status === 403) {
        console.log(`Search returned ${res.status}, stopping (no retry).`);
        break;
      }
      continue;
    }
    const place = ((await res.json()) as any).places?.[0];
    if (!place) { noMatch++; why("google found nothing"); continue; }
    const theirs = new Set(nums(place.formattedAddress ?? ""));
    if (!nums(v.address!).some((n) => theirs.has(n))) { mismatch++; why("street number differs from Google: " + (place.formattedAddress ?? "")); continue; }
    if (!nameAgrees(v.name, place.displayName?.text ?? "")) { nameMiss++; why("name differs from Google: " + (place.displayName?.text ?? "")); continue; }
    const ref = place.photos?.[0]?.name;
    if (!ref) { noPhoto++; why("google has no photo"); continue; }

    photoCalls++;
    const pr = await fetch(`https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1200&key=${KEY}`);
    if (!pr.ok) { failed++; continue; }
    // Re-encode before storing: 1000 px wide, JPEG q78 looks identical on screen and is about 60% smaller
    // (about 120 KB instead of 400 KB), which matters because photos live in Postgres as base64.
    const buf = await sharp(Buffer.from(await pr.arrayBuffer())).rotate().resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    const mime = "image/jpeg";
    await db.execute(sql`
      INSERT INTO specials.venue_photos (venue_id, photo_data, photo_mime_type, submission_id, source)
      VALUES (${v.id}, ${buf.toString("base64")}, ${mime}, NULL, 'google')`);
    saved++;
    if (saved % 50 === 0) console.log(`  saved ${saved} (photo calls ${photoCalls}, searches ${searches})`);
  }
  console.log(`DONE photoCalls=${photoCalls} saved=${saved} searches=${searches} noMatch=${noMatch} addressMismatch=${mismatch} nameMismatch=${nameMiss} noPhoto=${noPhoto} failed=${failed}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
