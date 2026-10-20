// Multi-region version of the Kelowna backfill, with a hard photo-call budget so we
// never get close to the 1,000/month free Place Photo cap (Text Search's 5,000/month
// cap isn't the constraint -- Photos is). Stops immediately, mid-region if needed,
// once the budget is spent, and never retries a venue already attempted this run.
import { readFileSync } from "fs";
import { db, venues, venuePhotos, regions } from "@/db";
import { eq, and, inArray } from "drizzle-orm";

const KEY_PATH =
  "C:\\Users\\Mike\\AppData\\Local\\Temp\\claude\\C--Users-Mike\\faff1799-847b-4e94-aee3-06c23947cdaa\\scratchpad\\places-test-key.txt";
const API_KEY = readFileSync(KEY_PATH, "utf8").trim();

// Conservative -- leaves real headroom under the 1,000/month free Photos cap even
// accounting for the ~88 calls already made this month during the Kelowna run.
const PHOTO_CALL_BUDGET = 820;

const REGION_SLUGS = [
  "penticton",
  "toronto-west",
  "toronto-east",
  "toronto-core",
  "toronto-north",
  "calgary",
  "calgary-sw",
  "calgary-nw",
  "calgary-se",
  "calgary-ne",
  "montreal-core",
  "montreal-east",
  "ottawa",
  "vancouver",
  "edmonton",
  "winnipeg",
];

function numberSet(address: string): Set<string> {
  return new Set((address.match(/\d+/g) ?? []).filter((n) => n.length >= 2));
}
function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const n of a) if (b.has(n)) return true;
  return false;
}

let photoCalls = 0;

async function backfillRegion(slug: string) {
  const [region] = await db.select().from(regions).where(eq(regions.slug, slug));
  if (!region) {
    console.log(`\n=== ${slug}: region not found, skipping ===`);
    return;
  }

  const rows = await db
    .select({ id: venues.id, name: venues.name, address: venues.address, city: venues.city })
    .from(venues)
    .where(and(eq(venues.regionId, region.id), eq(venues.active, true)));
  const withPhoto = new Set(
    (await db.select({ venueId: venuePhotos.venueId }).from(venuePhotos)).map((r) => r.venueId)
  );
  const targets = rows.filter((v) => !withPhoto.has(v.id));

  console.log(`\n=== ${region.brandName} (${slug}): ${rows.length} active, ${targets.length} no-photo ===`);

  let saved = 0;
  let mismatch = 0;
  let noMatch = 0;
  let noPhoto = 0;

  for (const v of targets) {
    if (photoCalls >= PHOTO_CALL_BUDGET) {
      console.log(`  BUDGET REACHED (${photoCalls}/${PHOTO_CALL_BUDGET} photo calls) -- stopping mid-region.`);
      return "budget";
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
    if (!searchRes.ok) continue;
    const place = searchJson.places?.[0];
    if (!place) {
      noMatch++;
      continue;
    }

    const ours = numberSet(v.address);
    const theirs = numberSet(place.formattedAddress ?? "");
    if (!hasOverlap(ours, theirs)) {
      mismatch++;
      continue;
    }

    const photoRef = place.photos?.[0]?.name;
    if (!photoRef) {
      noPhoto++;
      continue;
    }

    photoCalls++;
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=1200&key=${API_KEY}`
    );
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
    saved++;
  }

  console.log(`  saved=${saved} mismatch=${mismatch} noMatch=${noMatch} noPhoto=${noPhoto} (running photoCalls=${photoCalls})`);
  return "done";
}

async function main() {
  for (const slug of REGION_SLUGS) {
    const result = await backfillRegion(slug);
    if (result === "budget") break;
  }
  console.log(`\nTotal photo calls this run: ${photoCalls} / budget ${PHOTO_CALL_BUDGET}`);
  process.exit(0);
}

main();
