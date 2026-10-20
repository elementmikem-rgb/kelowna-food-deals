// One-off backfill: for active Kelowna-region venues with no photo on file, find a
// matching Google Place (Text Search, Pro-tier fields only -- no ratings/atmosphere,
// keeps this on the cheap/high-free-cap SKU) and store its first photo in venuePhotos,
// same as a visitor/owner-submitted photo (submissionId null is already a supported
// case -- see venue-photos.ts). Skips any venue whose Google street number doesn't
// match ours, rather than guessing, and skips anything we can't confidently match.
import { readFileSync } from "fs";
import { db, venues, venuePhotos, regions } from "@/db";
import { eq, and, inArray } from "drizzle-orm";

const KEY_PATH =
  "C:\\Users\\Mike\\AppData\\Local\\Temp\\claude\\C--Users-Mike\\faff1799-847b-4e94-aee3-06c23947cdaa\\scratchpad\\places-test-key.txt";
const API_KEY = readFileSync(KEY_PATH, "utf8").trim();

function streetNumber(address: string): string | null {
  const m = address.match(/^\s*(\d+)/);
  return m ? m[1] : null;
}

async function main() {
  const rows = await db
    .select({ id: venues.id, name: venues.name, address: venues.address, city: venues.city })
    .from(venues)
    .innerJoin(regions, eq(venues.regionId, regions.id))
    .where(and(eq(regions.slug, "kelowna"), eq(venues.active, true)));

  const withPhoto = new Set(
    (await db.select({ venueId: venuePhotos.venueId }).from(venuePhotos)).map((r) => r.venueId)
  );
  const targets = rows.filter((v) => !withPhoto.has(v.id));

  console.log(`Kelowna region: ${rows.length} active venues, ${targets.length} with no photo on file.\n`);

  let matched = 0;
  let noMatch = 0;
  let addressMismatch = 0;
  let noPhoto = 0;
  let saved = 0;
  const addressMismatches: string[] = [];

  for (const v of targets) {
    const query = `${v.name}, ${v.address}, ${v.city ?? "Kelowna"}, BC`;
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
    if (!searchRes.ok) {
      console.log(`SKIP ${v.name} (id ${v.id}): search failed (${searchRes.status})`);
      noMatch++;
      continue;
    }
    const place = searchJson.places?.[0];
    if (!place) {
      noMatch++;
      continue;
    }

    const ourNum = streetNumber(v.address);
    const theirNum = streetNumber(place.formattedAddress ?? "");
    if (ourNum && theirNum && ourNum !== theirNum) {
      addressMismatch++;
      addressMismatches.push(
        `  ${v.name} (id ${v.id}): ours "${v.address}" vs Google "${place.formattedAddress}" -- street number mismatch, skipped`
      );
      continue;
    }
    matched++;

    const photoRef = place.photos?.[0]?.name;
    if (!photoRef) {
      noPhoto++;
      continue;
    }

    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=1200&key=${API_KEY}`
    );
    if (!photoRes.ok) {
      console.log(`SKIP ${v.name} (id ${v.id}): photo fetch failed (${photoRes.status})`);
      continue;
    }
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
    console.log(`SAVED ${v.name} (id ${v.id}) -- ${buf.length} bytes`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Candidates:        ${targets.length}`);
  console.log(`Matched a place:   ${matched}`);
  console.log(`No place match:    ${noMatch}`);
  console.log(`Address mismatch:  ${addressMismatch}`);
  console.log(`Matched, no photo: ${noPhoto}`);
  console.log(`Photos saved:      ${saved}`);
  if (addressMismatches.length) {
    console.log(`\nSkipped on address mismatch (review manually if you want these):`);
    addressMismatches.forEach((l) => console.log(l));
  }

  process.exit(0);
}

main();
