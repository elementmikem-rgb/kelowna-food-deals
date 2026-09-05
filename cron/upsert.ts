import { db, specials, scrapeRuns, venues } from "@/db";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { ExtractedSpecial } from "./extract";

export async function markVenueStillCurrent(venueId: number): Promise<void> {
  await db
    .update(specials)
    .set({ lastVerifiedAt: new Date() })
    .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt)));
}

// Archives every currently-active special for the venue (so they surface in
// "previous specials") and inserts the freshly extracted ones as current.
export async function replaceVenueSpecials(
  venueId: number,
  sourceUrl: string,
  extracted: ExtractedSpecial[]
): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(specials)
      .set({ archivedAt: now })
      .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt)));
    if (extracted.length === 0) return;
    await tx.insert(specials).values(
      extracted.map((s) => ({
        venueId,
        title: s.title,
        description: s.description,
        priceCents: s.price_cents,
        dayOfWeek: s.day_of_week,
        isMonthly: s.is_monthly,
        startTime: s.start_time,
        endTime: s.end_time,
        category: s.category,
        lastVerifiedAt: now,
        sourceUrl,
        confidence: s.confidence,
        extractionNotes: s.extraction_notes,
      }))
    );
  });
}

export async function logScrapeRun(row: {
  venueId: number;
  contentHash: string | null;
  changed: boolean;
  tokensUsed: number;
  error: string | null;
}): Promise<void> {
  await db.insert(scrapeRuns).values(row);
}

export async function getActiveVenues() {
  return db.select().from(venues).where(eq(venues.active, true));
}

export async function getLastContentHash(venueId: number): Promise<string | null> {
  const rows = await db
    .select({ contentHash: scrapeRuns.contentHash })
    .from(scrapeRuns)
    .where(and(eq(scrapeRuns.venueId, venueId), isNotNull(scrapeRuns.contentHash)))
    .orderBy(desc(scrapeRuns.ranAt))
    .limit(1);
  return rows[0]?.contentHash ?? null;
}
