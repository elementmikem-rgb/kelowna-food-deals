// One-off seed: Mike confirmed the bundle-discount tiers 2026-10-06 (10% at 3+
// venues, 20% at 5+) via the AskUserQuestion in that session -- see
// db/schema.ts's bundleDiscountTiers comment. Safe to re-run: clears and
// re-inserts rather than assuming a fresh table.
import { db, bundleDiscountTiers } from "../db";

async function main() {
  await db.delete(bundleDiscountTiers);
  await db.insert(bundleDiscountTiers).values([
    { minVenues: 3, discountPercent: 10 },
    { minVenues: 5, discountPercent: 20 },
  ]);
  const rows = await db.select().from(bundleDiscountTiers);
  console.log("bundle_discount_tiers:", rows);
  process.exit(0);
}
main();
