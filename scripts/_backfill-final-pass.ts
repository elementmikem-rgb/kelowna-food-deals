// Final pass over everything still photo-less in the 16 just-backfilled regions.
// Two accept paths:
//  1. Number overlap (any digit-sequence length, fixes the earlier len>=2 bug that
//     wrongly filtered out legitimate single-digit street numbers like "7 Alexander St").
//  2. Our address has NO digits at all (landmark/neighbourhood-style, e.g. "Glebe,
//     Ottawa, ON") -- in that case fall back to a strict name match (after stripping
//     generic words like "restaurant"/"bar"/"the") PLUS the matched place's address
//     containing our city. Deliberately does NOT apply this fallback when we DO have a
//     specific street number that simply didn't match Google's -- that's a real
//     conflict (e.g. Chantecler, Arcadia Bar), not vagueness, and stays skipped.
import { readFileSync } from "fs";
import { db, venues, venuePhotos, regions } from "@/db";
import { eq, and } from "drizzle-orm";

const KEY_PATH =
  "C:\\Users\\Mike\\AppData\\Local\\Temp\\claude\\C--Users-Mike\\faff1799-847b-4e94-aee3-06c23947cdaa\\scratchpad\\places-test-key.txt";
const API_KEY = readFileSync(KEY_PATH, "utf8").trim();
const PHOTO_CALL_BUDGET = 120;

const REGION_SLUGS = [
  "penticton", "toronto-west", "toronto-east", "toronto-core", "toronto-north",
  "calgary", "calgary-sw", "calgary-nw", "calgary-se", "calgary-ne",
  "montreal-core", "montreal-east", "ottawa", "vancouver", "edmonton", "winnipeg",
];

const STOPWORDS = new Set([
  "the", "a", "and", "of", "co", "inc", "ltd", "restaurant", "resto", "bistro",
  "bar", "grill", "pub", "lounge", "house", "eatery", "cafe", "kitchen", "tavern",
  "tavernas", "public", "social", "downtown",
]);

function allNumbers(address: string): string[] {
  return address.match(/\d+/g) ?? [];
}
function overlaps(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  return a.some((n) => setB.has(n));
}
function nameTokens(name: string): Set<string> {
  const clean = name
    .replace(/\([^)]*\)/g, " ") // strip parentheticals
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s]/g, " ");
  return new Set(clean.split(/\s+/).filter((t) => t && !STOPWORDS.has(t)));
}
function namesMatch(ours: string, theirs: string): boolean {
  const a = nameTokens(ours);
  const b = nameTokens(theirs);
  if (a.size === 0 || b.size === 0) return false;
  const intersection = [...a].filter((t) => b.has(t));
  if (a.size === 1) return b.size === 1 && intersection.length === 1; // single generic word: require exact equality
  return intersection.length >= a.size - 1; // allow at most one missing word
}

let photoCalls = 0;

async function run() {
  const withPhoto = new Set(
    (await db.select({ venueId: venuePhotos.venueId }).from(venuePhotos)).map((r) => r.venueId)
  );

  for (const slug of REGION_SLUGS) {
    if (photoCalls >= PHOTO_CALL_BUDGET) break;
    const [region] = await db.select().from(regions).where(eq(regions.slug, slug));
    if (!region) continue;
    const rows = await db
      .select({ id: venues.id, name: venues.name, address: venues.address, city: venues.city })
      .from(venues)
      .where(and(eq(venues.regionId, region.id), eq(venues.active, true)));
    const targets = rows.filter((v) => !withPhoto.has(v.id));
    if (targets.length === 0) continue;

    console.log(`\n=== ${region.brandName} ===`);

    for (const v of targets) {
      if (photoCalls >= PHOTO_CALL_BUDGET) {
        console.log("  BUDGET REACHED -- stopping.");
        break;
      }
      const query = `${v.name}, ${v.address}, ${v.city ?? region.brandName}`;
      const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos",
        },
        body: JSON.stringify({ textQuery: query }),
      });
      const searchJson = await searchRes.json();
      const place = searchJson.places?.[0];
      if (!place) continue;

      const ourNums = allNumbers(v.address);
      const theirNums = allNumbers(place.formattedAddress ?? "");
      let accept = false;
      let reason = "";

      if (ourNums.length > 0 && overlaps(ourNums, theirNums)) {
        accept = true;
        reason = "number overlap";
      } else if (ourNums.length === 0) {
        const cityOk = v.city ? (place.formattedAddress ?? "").toLowerCase().includes(v.city.toLowerCase()) : true;
        if (cityOk && namesMatch(v.name, place.displayName?.text ?? "")) {
          accept = true;
          reason = "name match, no address to confirm";
        }
      }

      if (!accept) {
        console.log(`  SKIP: ${v.name} (id ${v.id}) -- "${v.address}" vs "${place.displayName?.text}" @ "${place.formattedAddress}"`);
        continue;
      }

      const photoRef = place.photos?.[0]?.name;
      if (!photoRef) continue;

      photoCalls++;
      const photoRes = await fetch(`https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=1200&key=${API_KEY}`);
      if (!photoRes.ok) continue;
      const buf = Buffer.from(await photoRes.arrayBuffer());
      const mimeType = photoRes.headers.get("content-type") ?? "image/jpeg";

      await db.insert(venuePhotos).values({
        venueId: v.id,
        photoData: buf.toString("base64"),
        photoMimeType: mimeType,
        submissionId: null,
      source: "google",
      });
      console.log(`  SAVED (${reason}): ${v.name} (id ${v.id})`);
    }
  }

  console.log(`\nTotal photo calls: ${photoCalls} / budget ${PHOTO_CALL_BUDGET}`);
  process.exit(0);
}

run();
