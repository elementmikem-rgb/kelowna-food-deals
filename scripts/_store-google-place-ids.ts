// Store Google place IDs from one or more _google-venue-check.ts report files into venues.google_place_id.
// Only a venue whose street number AND name matched, and which Google reports as OPERATIONAL, gets an ID.
// Never overwrites an ID already stored. Dry run by default.
//   npx tsx --env-file=.env.local scripts/_store-google-place-ids.ts <report.json>[,<report2.json>] [--apply]
import { readFileSync } from "fs";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const files = (process.argv[2] ?? "").split(",").filter(Boolean);
if (!files.length) throw new Error("usage: _store-google-place-ids.ts <report.json>[,more.json] [--apply]");
const APPLY = process.argv.includes("--apply");

async function main() {
  const best = new Map<number, string>();
  let rows = 0, noId = 0, skipped = 0;
  for (const f of files) {
    for (const r of JSON.parse(readFileSync(f, "utf8")) as any[]) {
      rows++;
      if (!r.placeId) { noId++; continue; }
      // The report's own "matched" ignores one-digit street numbers ("9 Wyndham St N"), so also accept a
      // name match plus any shared number (any length) in the two address strings.
      const nums = (s: string) => new Set(s.match(/\d+/g) ?? []);
      const sharesNumber = r.address && r.googleAddress && [...nums(r.address)].some((n) => nums(r.googleAddress).has(n));
      const ok = r.matched || (r.nameOk && sharesNumber);
      if (!ok || r.businessStatus !== "OPERATIONAL") { skipped++; continue; }
      best.set(r.id, r.placeId);
    }
  }
  console.log(`${rows} report rows: ${best.size} usable place IDs, ${skipped} not matched or not operational, ${noId} rows without a place ID.`);
  if (!APPLY) { console.log("DRY RUN, add --apply to write."); return; }
  let written = 0;
  await db.transaction(async (tx) => {
    for (const [id, placeId] of best) {
      const r = (await tx.execute(sql`UPDATE specials.venues SET google_place_id = ${placeId} WHERE id = ${id} AND active AND google_place_id IS NULL RETURNING id`)) as unknown as any[];
      written += r.length;
    }
  });
  const c = (await db.execute(sql`SELECT count(google_place_id)::int AS with_id, count(*)::int AS venues FROM specials.venues WHERE active`)) as unknown as any[];
  console.log(`wrote ${written}. Active venues with a place ID: ${c[0].with_id} of ${c[0].venues}.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
