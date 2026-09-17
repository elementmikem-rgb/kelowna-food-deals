import { db, regions } from "../db";
import { inArray } from "drizzle-orm";
import { processVenue } from "../cron/index";
import { getActiveVenues } from "../cron/upsert";

const SLUGS = ["burnaby-tricities", "vancouver", "richmond", "surrey", "north-shore", "fraser-valley"];

async function main() {
  const regionRows = await db.select().from(regions).where(inArray(regions.slug, SLUGS));
  for (const region of regionRows) {
    const venueList = await getActiveVenues(region.id);
    console.log(`=== Scraping ${venueList.length} venues for ${region.brandName} (${region.slug}) ===`);
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
