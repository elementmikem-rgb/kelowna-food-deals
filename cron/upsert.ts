import { db, specials, events, scrapeRuns, venues } from "@/db";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { ExtractedSpecial, ExtractedEvent } from "./extract";

// Identity key for "is this the same special/event as before" -- deliberately
// excludes id/lastVerifiedAt/confidence/extractionNotes/sourceUrl, which are
// bookkeeping, not identity. Matches the dedup comparison lib/data.ts's
// getPreviousSpecials already uses for "is this archived row still live".
function specialIdentityKey(s: {
  title: string;
  description: string | null;
  priceCents: number | null;
  dayOfWeek: number | null;
  isMonthly: boolean;
  startTime: string | null;
  endTime: string | null;
  category: string;
}): string {
  return JSON.stringify([
    s.title,
    s.description,
    s.priceCents,
    s.dayOfWeek,
    s.isMonthly,
    s.startTime,
    s.endTime,
    s.category,
  ]);
}

function eventIdentityKey(e: {
  title: string;
  description: string | null;
  eventType: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  coverChargeCents: number | null;
}): string {
  return JSON.stringify([
    e.title,
    e.description,
    e.eventType,
    e.dayOfWeek,
    e.specificDate,
    e.startTime,
    e.endTime,
    e.coverChargeCents,
  ]);
}

// isNotNull(sourceUrl) throughout this file: cron-written rows always carry the
// scraped page's URL, visitor submissions (app/api/submit) always write null.
// Without the filter, cron archives visitor-submitted specials the first night
// the venue's own site changes, and re-stamps them "verified today" on every
// quiet night in between — neither of which it has any evidence for.
export async function markVenueStillCurrent(venueId: number): Promise<void> {
  const now = new Date();
  await db
    .update(specials)
    .set({ lastVerifiedAt: now })
    .where(
      and(
        eq(specials.venueId, venueId),
        isNull(specials.archivedAt),
        isNotNull(specials.sourceUrl)
      )
    );
  await db
    .update(events)
    .set({ lastVerifiedAt: now })
    .where(
      and(eq(events.venueId, venueId), isNull(events.archivedAt), isNotNull(events.sourceUrl))
    );
}

// Reconciles the venue's active specials against the freshly extracted set:
// an unchanged item keeps its row and just gets a fresh lastVerifiedAt (so it
// doesn't wrongly show up as "retired today" in the archive on a night when
// nothing about it actually changed); only items no longer present get
// archived, and only genuinely new items get inserted.
export async function replaceVenueSpecials(
  venueId: number,
  sourceUrl: string,
  extracted: ExtractedSpecial[]
): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(specials)
      .where(
        and(
          eq(specials.venueId, venueId),
          isNull(specials.archivedAt),
          isNotNull(specials.sourceUrl)
        )
      );

    const existingByKey = new Map<string, (typeof existing)[number][]>();
    for (const row of existing) {
      const key = specialIdentityKey(row);
      const list = existingByKey.get(key);
      if (list) list.push(row);
      else existingByKey.set(key, [row]);
    }

    const keptIds = new Set<number>();
    const toInsert: ExtractedSpecial[] = [];

    for (const s of extracted) {
      const key = specialIdentityKey({
        title: s.title,
        description: s.description,
        priceCents: s.price_cents,
        dayOfWeek: s.day_of_week,
        isMonthly: s.is_monthly,
        startTime: s.start_time,
        endTime: s.end_time,
        category: s.category,
      });
      const match = existingByKey.get(key)?.find((r) => !keptIds.has(r.id));
      if (match) {
        keptIds.add(match.id);
        await tx
          .update(specials)
          .set({ lastVerifiedAt: now, confidence: s.confidence, extractionNotes: s.extraction_notes })
          .where(eq(specials.id, match.id));
      } else {
        toInsert.push(s);
      }
    }

    const toArchiveIds = existing.filter((r) => !keptIds.has(r.id)).map((r) => r.id);
    if (toArchiveIds.length > 0) {
      await tx.update(specials).set({ archivedAt: now }).where(inArray(specials.id, toArchiveIds));
    }

    if (toInsert.length > 0) {
      await tx.insert(specials).values(
        toInsert.map((s) => ({
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
    }
  });
}

// Same reconciliation approach as replaceVenueSpecials -- see comment there.
export async function replaceVenueEvents(
  venueId: number,
  sourceUrl: string,
  extracted: ExtractedEvent[]
): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(events)
      .where(
        and(eq(events.venueId, venueId), isNull(events.archivedAt), isNotNull(events.sourceUrl))
      );

    const existingByKey = new Map<string, (typeof existing)[number][]>();
    for (const row of existing) {
      const key = eventIdentityKey(row);
      const list = existingByKey.get(key);
      if (list) list.push(row);
      else existingByKey.set(key, [row]);
    }

    const keptIds = new Set<number>();
    const toInsert: ExtractedEvent[] = [];

    for (const e of extracted) {
      const key = eventIdentityKey({
        title: e.title,
        description: e.description,
        eventType: e.event_type,
        dayOfWeek: e.day_of_week,
        specificDate: e.specific_date,
        startTime: e.start_time,
        endTime: e.end_time,
        coverChargeCents: e.cover_charge_cents,
      });
      const match = existingByKey.get(key)?.find((r) => !keptIds.has(r.id));
      if (match) {
        keptIds.add(match.id);
        await tx
          .update(events)
          .set({ lastVerifiedAt: now, confidence: e.confidence, extractionNotes: e.extraction_notes })
          .where(eq(events.id, match.id));
      } else {
        toInsert.push(e);
      }
    }

    const toArchiveIds = existing.filter((r) => !keptIds.has(r.id)).map((r) => r.id);
    if (toArchiveIds.length > 0) {
      await tx.update(events).set({ archivedAt: now }).where(inArray(events.id, toArchiveIds));
    }

    if (toInsert.length > 0) {
      await tx.insert(events).values(
        toInsert.map((e) => ({
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
    }
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
      requiresBrowser: venues.requiresBrowser,
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
