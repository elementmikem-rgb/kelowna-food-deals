// Inserts the venues discovered+enriched by _enrich-remainder-websearch.ts
// (scratch/enriched-remainder.json) into the live venues table. Each candidate already
// carries its destination region slug (assigned at discovery time), so unlike yesterday's
// _insert-discovered-venues.ts this does NOT need nearest-region matching -- just geocode
// for real lat/lng, falling back to the region's own center (flagged approxCoords) when
// there's no address or geocoding fails.
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "fs";
import { db, venues, regions } from "@/db";
import { geocodeWithFallbacks, sleep, GEOCODE_DELAY_MS } from "@/lib/geocode";
import { findLikelyDuplicate, type VenueLite } from "@/lib/venue-dedupe";

const DRY_RUN = process.env.DRY_RUN !== "0";

interface Candidate {
  slug: string;
  name: string;
  website: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface RegionInfo {
  city: string;
  province: string;
}

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function instagramHandleFrom(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return m ? m[1] : null;
}

async function main() {
  console.log(`=== ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE INSERT"} ===\n`);

  const candidates: Candidate[] = JSON.parse(readFileSync("scratch/enriched-remainder.json", "utf8"));
  const regionMap: Record<string, RegionInfo> = JSON.parse(readFileSync("scratch/region-city-map.json", "utf8"));

  const dbRegions = await db.select({ id: regions.id, slug: regions.slug, lat: regions.lat, lng: regions.lng }).from(regions);
  const regionBySlug = new Map(dbRegions.map((r) => [r.slug, r]));

  const existingNames = new Set(
    (await db.select({ name: venues.name }).from(venues)).map((v) => normalizeName(v.name))
  );

  // Every venue, including deactivated ones (a duplicate that was switched off must not be
  // re-imported), for the location-aware duplicate check below. Approximate coordinates are
  // only a region-center guess, so they are left out of the position comparison.
  const existingVenues: VenueLite[] = (
    await db
      .select({
        id: venues.id,
        name: venues.name,
        website: venues.website,
        lat: venues.lat,
        lng: venues.lng,
        approx: venues.approxCoords,
        regionId: venues.regionId,
      })
      .from(venues)
  ).map((r) => ({
    id: r.id,
    name: r.name,
    website: r.website,
    lat: r.approx ? null : r.lat,
    lng: r.approx ? null : r.lng,
    regionId: r.regionId,
  }));

  let inserted = 0;
  let skippedDup = 0;
  let skippedNoRegion = 0;
  let approxCount = 0;

  for (const c of candidates) {
    const key = normalizeName(c.name);
    if (existingNames.has(key)) {
      skippedDup++;
      continue;
    }

    const region = regionBySlug.get(c.slug);
    const info = regionMap[c.slug];
    if (!region || !info) {
      skippedNoRegion++;
      console.log(`  [SKIPPED - unknown region] ${c.name} (slug=${c.slug})`);
      continue;
    }

    let lat: number | null;
    let lng: number | null;
    let approxCoords = false;
    let address = c.address;

    if (c.address) {
      const geo = await geocodeWithFallbacks(c.address);
      await sleep(GEOCODE_DELAY_MS);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      } else {
        lat = region.lat;
        lng = region.lng;
        approxCoords = true;
      }
    } else {
      lat = region.lat;
      lng = region.lng;
      approxCoords = true;
      address = `${info.city}, ${info.province}`;
    }
    if (approxCoords) approxCount++;

    const dup = findLikelyDuplicate(
      { name: c.name, website: c.website, lat: approxCoords ? null : lat, lng: approxCoords ? null : lng, regionId: region.id },
      existingVenues
    );
    if (dup) {
      console.log(`  [SKIPPED - likely duplicate of #${dup.venue.id} "${dup.venue.name}" (${dup.reason})] ${c.name}`);
      skippedDup++;
      continue;
    }

    const ig = instagramHandleFrom(c.website);

    if (DRY_RUN) {
      console.log(
        `  [would insert] ${c.name} | region=${c.slug} | ${address} | ${c.website ?? "no site"} | email=${c.email ?? "none"}${approxCoords ? " | APPROX COORDS" : ""}`
      );
    } else {
      try {
        const [row] = await db
          .insert(venues)
          .values({
            name: c.name,
            address: address!,
            regionId: region.id,
            city: info.city,
            lat,
            lng,
            approxCoords,
            phone: c.phone,
            website: ig ? null : c.website,
            instagramHandle: ig,
            contactEmail: c.email,
            sourceUrls: c.website ? [c.website] : [],
            active: true,
          })
          .returning({ id: venues.id });
        existingNames.add(key);
        existingVenues.push({
          id: row.id,
          name: c.name,
          website: ig ? null : c.website,
          lat: approxCoords ? null : lat,
          lng: approxCoords ? null : lng,
          regionId: region.id,
        });
      } catch (err) {
        console.log(`  [SKIPPED - insert failed] ${c.name}: ${(err as Error).message.slice(0, 120)}`);
        skippedDup++;
        continue;
      }
    }
    inserted++;

    if (inserted % 50 === 0) {
      console.log(`  ... ${inserted} processed so far`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`${DRY_RUN ? "Would insert" : "Inserted"}: ${inserted}`);
  console.log(`Skipped (already in DB): ${skippedDup}`);
  console.log(`Skipped (unknown region): ${skippedNoRegion}`);
  console.log(`Approx coords (no geocode): ${approxCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
