import { db } from "../db";
import { sql } from "drizzle-orm";

// Read-only. Everything a blog guide needs for one region, as JSON on stdout:
//   npx tsx --env-file=.env.local scripts/query-guide-data.ts <region-slug>
// One entry per ACTIVE venue that has at least one non-archived special, with its id (for the
// /<region>/venues/<id> link), address, website, and each live special's days, times, price and
// last-verified date. Venues with no live specials are listed separately as "noSpecials" so a
// guide's "What's not on this list" section can name them honestly.
async function main() {
  const regionSlug = process.argv[2];
  if (!regionSlug) {
    console.error("usage: query-guide-data.ts <region-slug>");
    process.exit(2);
  }
  const region = (await db.execute(sql`
    SELECT id, slug, brand_name FROM specials.regions WHERE slug = ${regionSlug}
  `)) as unknown as Array<{ id: number; slug: string; brand_name: string }>;
  const r = region[0];
  if (!r) {
    console.error(`region not found: ${regionSlug}`);
    process.exit(1);
  }

  const rows = (await db.execute(sql`
    SELECT v.id AS venue_id, v.name, v.address, v.city, v.website, v.active,
           s.id AS special_id, s.title, s.description, s.price_cents, s.day_of_week,
           s.is_monthly, s.start_time, s.end_time, s.category, s.last_verified_at, s.confidence
    FROM specials.venues v
    LEFT JOIN specials.specials s ON s.venue_id = v.id AND s.archived_at IS NULL
    WHERE v.region_id = ${r.id} AND v.active = true
    ORDER BY v.name, s.day_of_week NULLS FIRST, s.start_time NULLS FIRST
  `)) as unknown as Array<Record<string, unknown>>;

  const byVenue = new Map<number, Record<string, unknown>>();
  for (const row of rows) {
    const id = row.venue_id as number;
    if (!byVenue.has(id)) {
      byVenue.set(id, {
        id,
        name: row.name,
        address: row.address,
        city: row.city,
        website: row.website,
        specials: [] as unknown[],
      });
    }
    if (row.special_id) {
      (byVenue.get(id)!.specials as unknown[]).push({
        title: row.title,
        description: row.description,
        priceCents: row.price_cents,
        dayOfWeek: row.day_of_week, // 0 = Sunday ... 6 = Saturday; null = every day
        isMonthly: row.is_monthly,
        start: row.start_time,
        end: row.end_time,
        category: row.category,
        lastVerifiedAt: row.last_verified_at,
        confidence: row.confidence,
      });
    }
  }
  const all = [...byVenue.values()];
  const withSpecials = all.filter((v) => (v.specials as unknown[]).length > 0);
  const noSpecials = all
    .filter((v) => (v.specials as unknown[]).length === 0)
    .map((v) => ({ id: v.id, name: v.name, address: v.address, website: v.website }));

  console.log(
    JSON.stringify(
      {
        region: { id: r.id, slug: r.slug, brandName: r.brand_name },
        asOf: new Date().toISOString().slice(0, 10),
        venuesWithSpecials: withSpecials.length,
        venuesActiveTotal: all.length,
        venues: withSpecials,
        noSpecials,
      },
      null,
      1
    )
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(String(e.message ?? e).split("\n")[0]);
  process.exit(1);
});
