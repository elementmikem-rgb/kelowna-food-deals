import { db, specials, events, scrapeRuns, venues } from "@/db";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { ExtractedSpecial, ExtractedEvent } from "./extract";

export async function markVenueStillCurrent(venueId: number): Promise<void> {
  const now = new Date();
  await db
    .update(specials)
    .set({ lastVerifiedAt: now })
    .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt)));
  await db
    .update(events)
    .set({ lastVerifiedAt: now })
    .where(and(eq(events.venueId, venueId), isNull(events.archivedAt)));
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

export async function replaceVenueEvents(
  venueId: number,
  sourceUrl: string,
  extracted: ExtractedEvent[]
): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(events)
      .set({ archivedAt: now })
      .where(and(eq(events.venueId, venueId), isNull(events.archivedAt)));
    if (extracted.length === 0) return;
    await tx.insert(events).values(
      extracted.map((e) => ({
        venueId,
        title: e.title,
        description: e.description,
        eventType: e.event_type,
        dayOfWeek: e.day_of_week,
        specificDate: e.specific_date,
        startTime: e.start_time,
        endTime: e.end_time,
        coverChargeCents: e.cover_charge_cents,
        lastVerifiedAt: now,
        sourceUrl,
        confidence: e.confidence,
        extractionNotes: e.extraction_notes,
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

// Order by how long ago each venue was last attempted (never-scraped first),
// so a token-ceiling abort mid-run starves a different tail each time instead
// of always the same venues past whatever the fixed order used to put first.
export async function getActiveVenues() {
  const lastRun = db
    .select({
      venueId: scrapeRuns.venueId,
      ranAt: sql<Date>`max(${scrapeRuns.ranAt})`.as("ran_at"),
    })
    .from(scrapeRuns)
    .groupBy(scrapeRuns.venueId)
    .as("last_run");

  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      website: venues.website,
      menuUrl: venues.menuUrl,
    })
    .from(venues)
    .leftJoin(lastRun, eq(venues.id, lastRun.venueId))
    .where(eq(venues.active, true))
    .orderBy(sql`${lastRun.ranAt} asc nulls first`);

  return rows;
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
