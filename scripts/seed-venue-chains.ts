// One-time (and re-runnable) seed for venue_chains + venues.chainId backfill -- purely
// data, not a migration, so a new chain can be added here and re-run any time without a
// deploy. See docs/superpowers/specs -- this grouping only powers the admin claims
// queue's "this chain has N other claimed locations" suggestion; it is never a source of
// automatic trust (see the moat-layer-3 plan this shipped from).
import { db, venues, venueChains } from "@/db";
import { and, eq, ilike, isNull } from "drizzle-orm";

// Each prefix is matched case-insensitively against the start of a venue's name.
// Verified against live data (2026-09-17): every location of these 6 chains follows a
// consistent "{Brand} ({Location})" or "{Brand} - {Location}" pattern, no fuzzy matching
// needed. Add a new chain here and re-run this script to extend -- no code change
// elsewhere required.
const CHAINS: { canonicalName: string; namePrefix: string }[] = [
  { canonicalName: "Boston Pizza", namePrefix: "Boston Pizza" },
  { canonicalName: "Cactus Club Cafe", namePrefix: "Cactus Club" },
  { canonicalName: "White Spot", namePrefix: "White Spot" },
  { canonicalName: "Match Eatery & Public House", namePrefix: "Match Eatery" },
  { canonicalName: "Match Eatery & Public House", namePrefix: "MATCH Eatery" },
  { canonicalName: "JOEY", namePrefix: "JOEY" },
  { canonicalName: "Earls", namePrefix: "Earls" },
];

async function main() {
  for (const chain of CHAINS) {
    let [chainRow] = await db
      .select({ id: venueChains.id })
      .from(venueChains)
      .where(eq(venueChains.canonicalName, chain.canonicalName))
      .limit(1);

    if (!chainRow) {
      [chainRow] = await db
        .insert(venueChains)
        .values({ canonicalName: chain.canonicalName })
        .returning({ id: venueChains.id });
      console.log(`Created chain: ${chain.canonicalName} (id ${chainRow.id})`);
    }

    const updated = await db
      .update(venues)
      .set({ chainId: chainRow.id })
      .where(and(ilike(venues.name, `${chain.namePrefix}%`), isNull(venues.chainId)))
      .returning({ id: venues.id, name: venues.name });

    if (updated.length > 0) {
      console.log(`  Matched ${updated.length} venue(s) to "${chain.namePrefix}%":`);
      for (const v of updated) console.log(`    ${v.id}: ${v.name}`);
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main();
