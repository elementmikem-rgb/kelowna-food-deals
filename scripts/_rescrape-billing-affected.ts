import { db, venues, regions } from "../db";
import { inArray, eq } from "drizzle-orm";
import { processVenue } from "../cron/index";

async function main() {
  const SLUGS = ["fraser-valley", "north-shore", "surrey"];
  const regionRows = await db.select().from(regions).where(inArray(regions.slug, SLUGS));
  for (const region of regionRows) {
    const venueList = await db.select().from(venues).where(eq(venues.regionId, region.id));
    console.log(`=== ${region.slug}: ${venueList.length} venues ===`);
    for (const venue of venueList) {
      await processVenue(venue, region.id);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
