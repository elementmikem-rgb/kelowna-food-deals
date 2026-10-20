// Takes the venues already discovered+enriched by _places-discovery-test.ts (read back
// from today's log files -- no re-spending of Place Details calls) and inserts them for
// real. Geocodes with the existing free lib/geocode.ts helper, assigns each venue to its
// nearest region by lat/lng (same "nearest region center" convention the regions.lat/lng
// column comment describes), and does one more live dedup check against the DB right
// before inserting (defense in depth beyond the dedup already done at discovery time).
//
// DRY_RUN=1 (default) prints what would be inserted without writing anything.
// DRY_RUN=0 actually inserts.
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "fs";
import { db, venues, regions } from "@/db";
import { inArray } from "drizzle-orm";
import { geocodeWithFallbacks, sleep, GEOCODE_DELAY_MS } from "@/lib/geocode";
import { findLikelyDuplicate, type VenueLite } from "@/lib/venue-dedupe";

const DRY_RUN = process.env.DRY_RUN !== "0";

interface Candidate {
  name: string;
  website: string | null;
  address: string;
  contactEmail: string | null;
}

interface CitySource {
  city: string;
  logPaths: string[];
  regionSlugs: string[]; // candidate regions to nearest-match against
}

const TASKDIR =
  "C:\\Users\\Mike\\AppData\\Local\\Temp\\claude\\C--Users-Mike\\faff1799-847b-4e94-aee3-06c23947cdaa\\tasks";
const SCRATCH = "C:\\kelowna-specials\\scratch";

const SOURCES: CitySource[] = [
  {
    city: "Calgary",
    logPaths: [
      `${TASKDIR}\\bgkpstdd6.output`,
      `${TASKDIR}\\b359fwky4.output`,
      `${SCRATCH}\\places-batch3.log`,
      `${SCRATCH}\\places-batch4.log`,
    ],
    regionSlugs: ["calgary", "calgary-nw", "calgary-ne", "calgary-sw", "calgary-se"],
  },
  {
    city: "Vancouver",
    logPaths: [`${SCRATCH}\\places-vancouver-batch1.log`],
    regionSlugs: ["vancouver"],
  },
  {
    city: "Toronto",
    logPaths: [`${SCRATCH}\\places-toronto-batch1.log`],
    regionSlugs: ["toronto-core", "toronto-east", "toronto-north", "toronto-west"],
  },
];

function parseLog(text: string): Map<string, { website: string | null; address: string }> {
  const out = new Map<string, { website: string | null; address: string }>();
  // Step 3 lines: "  Name | https://site.com/ | 123 St, City, Prov Postal, Canada"
  // or "  Name | NO WEBSITE | 123 St, ..."
  const re = /^ {2}(.+?) \| (NO WEBSITE|https?:\/\/\S+) \| (.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const [, name, website, address] = m;
    out.set(name.trim(), { website: website === "NO WEBSITE" ? null : website, address: address.trim() });
  }
  return out;
}

function parseEmails(text: string): Map<string, string> {
  const out = new Map<string, string>();
  // Step 4 lines: "  Name (https://site.com/) -> email: foo@bar.com" or "-> email: none found"
  const re = /^ {2}(.+?) \(.*?\) -> email: (\S+@\S+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // \S+ to end-of-line happily swallows a trailing sentence-ending period the
    // model writes after the email -- no valid email ends in a literal dot.
    // Confirmed live 2026-10-09: this (or the sibling regex in
    // _backfill-existing-emails-websearch.ts) produced 5,985 bad
    // venues.contactEmail rows, every one of which failed Brevo's send check.
    out.set(m[1].trim(), m[2].trim().replace(/\.+$/, ""));
  }
  return out;
}

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function instagramHandleFrom(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return m ? m[1] : null;
}

async function main() {
  console.log(`=== ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE INSERT"} ===\n`);

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

  let totalInserted = 0;
  let totalSkippedDup = 0;
  let totalSkippedNoAddress = 0;

  for (const source of SOURCES) {
    console.log(`--- ${source.city} ---`);

    // Merge candidates across all this city's log files (Map naturally dedupes by name).
    const candidates = new Map<string, Candidate>();
    for (const path of source.logPaths) {
      let text: string;
      try {
        text = readFileSync(path, "utf8");
      } catch {
        console.log(`  (skipping missing log: ${path})`);
        continue;
      }
      const enriched = parseLog(text);
      const emails = parseEmails(text);
      for (const [name, data] of enriched) {
        candidates.set(name, {
          name,
          website: data.website,
          address: data.address,
          contactEmail: emails.get(name) ?? null,
        });
      }
    }
    console.log(`  Parsed ${candidates.size} unique candidates from logs`);

    const cityRegions = await db
      .select({ id: regions.id, slug: regions.slug, lat: regions.lat, lng: regions.lng })
      .from(regions)
      .where(inArray(regions.slug, source.regionSlugs));

    // venues.name is globally unique across the WHOLE platform, not just within a
    // region (a chain like Earls or The Canadian Brewhouse can already have a location
    // in a totally different city) -- so dedup has to check every venue, not just this
    // city group's. Discovered the hard way: the first live-insert run crashed on
    // "Earls Kitchen + Bar" colliding with an existing row in an unrelated region.
    const existingNames = new Set(
      (await db.select({ name: venues.name }).from(venues)).map((v) => normalizeName(v.name))
    );

    for (const c of [...candidates.values()]) {
      if (existingNames.has(normalizeName(c.name))) {
        totalSkippedDup++;
        continue;
      }
      if (!c.address) {
        totalSkippedNoAddress++;
        continue;
      }

      const geo = await geocodeWithFallbacks(c.address);
      await sleep(GEOCODE_DELAY_MS);

      let regionId: number;
      let lat: number | null;
      let lng: number | null;
      let approxCoords = false;

      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        // Nearest region center among this city's candidate regions.
        let best = cityRegions[0];
        let bestDist = Infinity;
        for (const r of cityRegions) {
          if (r.lat == null || r.lng == null) continue;
          const d = haversineKm({ lat, lng }, { lat: r.lat, lng: r.lng });
          if (d < bestDist) {
            bestDist = d;
            best = r;
          }
        }
        regionId = best.id;
      } else {
        // Geocode failed -- fall back to the city's primary region center, flagged.
        const fallback = cityRegions[0];
        regionId = fallback.id;
        lat = fallback.lat;
        lng = fallback.lng;
        approxCoords = true;
      }

      const dup = findLikelyDuplicate(
        { name: c.name, website: c.website, lat: approxCoords ? null : lat, lng: approxCoords ? null : lng, regionId },
        existingVenues
      );
      if (dup) {
        console.log(`  [SKIPPED - likely duplicate of #${dup.venue.id} "${dup.venue.name}" (${dup.reason})] ${c.name}`);
        totalSkippedDup++;
        continue;
      }

      const ig = instagramHandleFrom(c.website);

      if (DRY_RUN) {
        console.log(
          `  [would insert] ${c.name} | region=${cityRegions.find((r) => r.id === regionId)?.slug} | ${c.address} | ${c.website ?? "no site"} | email=${c.contactEmail ?? "none"}${approxCoords ? " | APPROX COORDS" : ""}`
        );
      } else {
        try {
          const [row] = await db
            .insert(venues)
            .values({
              name: c.name,
              address: c.address,
              regionId,
              city: source.city,
              lat,
              lng,
              approxCoords,
              website: ig ? null : c.website,
              instagramHandle: ig,
              contactEmail: c.contactEmail,
              sourceUrls: c.website ? [c.website] : [],
              active: true,
            })
            .returning({ id: venues.id });
          existingVenues.push({
            id: row.id,
            name: c.name,
            website: ig ? null : c.website,
            lat: approxCoords ? null : lat,
            lng: approxCoords ? null : lng,
            regionId,
          });
          // Keep the in-memory set current so two same-named candidates within this
          // same run (a chain with two locations Google gave the identical display
          // name) don't both attempt the insert -- the second now skips cleanly
          // instead of crashing on the second attempt.
          existingNames.add(normalizeName(c.name));
        } catch (err) {
          console.log(`  [SKIPPED - insert failed] ${c.name}: ${(err as Error).message.slice(0, 120)}`);
          totalSkippedDup++;
          continue;
        }
      }
      totalInserted++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`${DRY_RUN ? "Would insert" : "Inserted"}: ${totalInserted}`);
  console.log(`Skipped (already in DB): ${totalSkippedDup}`);
  console.log(`Skipped (no address): ${totalSkippedNoAddress}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
