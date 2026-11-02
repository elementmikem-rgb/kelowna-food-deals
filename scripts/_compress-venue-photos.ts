// Re-encode stored venue photos (base64 in specials.venue_photos) to 1000 px wide, JPEG q78.
// A photo is only rewritten when the result is at least 20% smaller, so already-small files are left alone.
// Run: npx tsx --env-file=.env.local scripts/_compress-venue-photos.ts [--run]   (no flag = dry run, no writes)
import { db } from "@/db";
import { sql } from "drizzle-orm";
import sharp from "sharp";

const RUN = process.argv.includes("--run");

async function main() {
  const ids = ((await db.execute(sql`
    SELECT id FROM specials.venue_photos WHERE length(photo_data) > 150000 ORDER BY id`)) as unknown as Array<{ id: number }>).map((r) => r.id);
  console.log(`${ids.length} photos over about 110 KB. Mode: ${RUN ? "WRITE" : "dry run"}`);
  let before = 0, after = 0, changed = 0, skipped = 0, failed = 0;
  for (const [i, id] of ids.entries()) {
    try {
      const [row] = (await db.execute(sql`SELECT photo_data FROM specials.venue_photos WHERE id = ${id}`)) as unknown as Array<{ photo_data: string }>;
      const orig = Buffer.from(row.photo_data, "base64");
      const out = await sharp(orig).rotate().resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      if (out.length > orig.length * 0.8) { skipped++; continue; }
      before += orig.length;
      after += out.length;
      if (RUN) {
        await db.execute(sql`UPDATE specials.venue_photos SET photo_data = ${out.toString("base64")}, photo_mime_type = 'image/jpeg' WHERE id = ${id}`);
      }
      changed++;
    } catch (e) {
      failed++;
      console.log(`  photo ${id} failed: ${(e as Error).message}`);
    }
    if ((i + 1) % 250 === 0) console.log(`  ${i + 1}/${ids.length} changed=${changed} skipped=${skipped} failed=${failed}`);
  }
  console.log(`DONE changed=${changed} skipped=${skipped} failed=${failed} bytes ${(before / 1048576).toFixed(0)} MB -> ${(after / 1048576).toFixed(0)} MB (saved ${((before - after) / 1048576).toFixed(0)} MB)`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
