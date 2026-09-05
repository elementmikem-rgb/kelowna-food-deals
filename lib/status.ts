import { db, scrapeRuns } from "@/db";
import { desc } from "drizzle-orm";

export async function getLastScrapeTime(): Promise<Date | null> {
  const rows = await db
    .select({ ranAt: scrapeRuns.ranAt })
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.ranAt))
    .limit(1);
  return rows[0]?.ranAt ?? null;
}
