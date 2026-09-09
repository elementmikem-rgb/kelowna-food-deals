import { db, specials, events, menuItems, scrapeRuns, venues } from "@/db";
import { and, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { ExtractedSpecial, ExtractedEvent, ExtractedMenuItem } from "./extract";
import { pacificTodayISODate } from "@/lib/time";
import { specialIdentityKey, eventIdentityKey } from "@/lib/archived-match";

function menuItemIdentityKey(m: {
  name: string;
  description: string | null;
  priceCents: number | null;
}): string {
  return JSON.stringify([m.name, m.description, m.priceCents]);
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
  await db
    .update(menuItems)
    .set({ lastVerifiedAt: now })
    .where(
      and(
        eq(menuItems.venueId, venueId),
        isNull(menuItems.archivedAt),
        isNotNull(menuItems.sourceUrl)
      )
    );
}

// Reconciles the venue's active specials against the freshly extracted set:
// an unchanged item keeps its row and just gets a fresh lastVerifiedAt (so it
// doesn't wrongly show up as "retired today" in the archive on a night when
// nothing about it actually changed); only items no longer present get
// archived, and only genuinely new items get inserted.
//
// A manually archived special (see db/schema.ts's archivedManually) is a
// standing human decision, not just "not currently on the page" -- if the
// venue's site still describes it (unchanged wording an admin already reviewed
// and rejected, e.g. because the venue told us directly it's discontinued),
// that content must NOT come back to life as a new active row just because
// this scrape's extraction still finds it. Only content cron itself archived
// (superseded by a later version) is eligible to be reinserted if it recurs.
export async function replaceVenueSpecials(
  venueId: number,
  regionId: number,
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
    const suppressed = await tx
      .select()
      .from(specials)
      .where(
        and(
          eq(specials.venueId, venueId),
          eq(specials.archivedManually, true),
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
    const suppressedKeys = new Set(suppressed.map((row) => specialIdentityKey(row)));

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
      } else if (suppressedKeys.has(key)) {
        // Matches a manually archived special exactly -- leave it archived.
        continue;
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
          regionId,
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

// Same reconciliation approach as replaceVenueSpecials -- see comment there,
// including the archivedManually suppression rule.
export async function replaceVenueEvents(
  venueId: number,
  regionId: number,
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
    const suppressed = await tx
      .select()
      .from(events)
      .where(
        and(
          eq(events.venueId, venueId),
          eq(events.archivedManually, true),
          isNotNull(events.sourceUrl)
        )
      );

    const existingByKey = new Map<string, (typeof existing)[number][]>();
    for (const row of existing) {
      const key = eventIdentityKey(row);
      const list = existingByKey.get(key);
      if (list) list.push(row);
      else existingByKey.set(key, [row]);
    }
    const suppressedKeys = new Set(suppressed.map((row) => eventIdentityKey(row)));

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
      } else if (suppressedKeys.has(key)) {
        // Matches a manually archived event exactly -- leave it archived.
        continue;
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
          regionId,
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

// Same reconciliation approach as replaceVenueSpecials/replaceVenueEvents --
// see the comment on replaceVenueSpecials. Unlike specials, a menu item
// never needs "no price but has discount language" leniency: it's just the
// regular a-la-carte listing, so every item always has a real price.
export async function replaceVenueMenuItems(
  venueId: number,
  sourceUrl: string,
  extracted: ExtractedMenuItem[]
): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.venueId, venueId),
          isNull(menuItems.archivedAt),
          isNotNull(menuItems.sourceUrl)
        )
      );

    const existingByKey = new Map<string, (typeof existing)[number][]>();
    for (const row of existing) {
      const key = menuItemIdentityKey(row);
      const list = existingByKey.get(key);
      if (list) list.push(row);
      else existingByKey.set(key, [row]);
    }

    const keptIds = new Set<number>();
    const toInsert: ExtractedMenuItem[] = [];

    for (const m of extracted) {
      const key = menuItemIdentityKey({
        name: m.name,
        description: m.description,
        priceCents: m.price_cents,
      });
      const match = existingByKey.get(key)?.find((r) => !keptIds.has(r.id));
      if (match) {
        keptIds.add(match.id);
        await tx
          .update(menuItems)
          .set({ lastVerifiedAt: now, confidence: m.confidence, extractionNotes: m.extraction_notes })
          .where(eq(menuItems.id, match.id));
      } else {
        toInsert.push(m);
      }
    }

    const toArchiveIds = existing.filter((r) => !keptIds.has(r.id)).map((r) => r.id);
    if (toArchiveIds.length > 0) {
      await tx.update(menuItems).set({ archivedAt: now }).where(inArray(menuItems.id, toArchiveIds));
    }

    if (toInsert.length > 0) {
      await tx.insert(menuItems).values(
        toInsert.map((m) => ({
          venueId,
          name: m.name,
          description: m.description,
          priceCents: m.price_cents,
          lastVerifiedAt: now,
          sourceUrl,
          confidence: m.confidence,
          extractionNotes: m.extraction_notes,
        }))
      );
    }
  });
}

// Appends newly discovered candidate pages (see discover.ts) to a venue's
// sourceUrls, deduped -- a plain array update rather than anything
// per-element, since this only ever grows and is small (capped by
// discoverVenueLinks' own MAX_DISCOVERED).
export async function mergeVenueSourceUrls(venueId: number, newUrls: string[]): Promise<void> {
  if (newUrls.length === 0) return;
  const [venue] = await db
    .select({ sourceUrls: venues.sourceUrls })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
  if (!venue) return;
  const merged = Array.from(new Set([...venue.sourceUrls, ...newUrls]));
  if (merged.length === venue.sourceUrls.length) return;
  await db.update(venues).set({ sourceUrls: merged }).where(eq(venues.id, venueId));
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
export async function getActiveVenues(regionId: number) {
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
      sourceUrls: venues.sourceUrls,
      requiresBrowser: venues.requiresBrowser,
    })
    .from(venues)
    .leftJoin(lastRun, eq(venues.id, lastRun.venueId))
    .where(and(eq(venues.active, true), eq(venues.regionId, regionId)))
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

// A month-limited special (isMonthly with a known monthlyThroughDate, e.g. a venue's
// rotating "menu of the month" insert) archives itself once past that date -- no
// manual cleanup needed. Reuses archivedAt, the same "no longer active" signal every
// other special already uses, so it also shows up correctly in the venue's "Previously
// Featured" history instead of just vanishing.
export async function archiveExpiredMonthlySpecials(): Promise<{ archived: number }> {
  const today = pacificTodayISODate();
  const result = await db
    .update(specials)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(specials.isMonthly, true),
        isNull(specials.archivedAt),
        isNotNull(specials.monthlyThroughDate),
        lt(specials.monthlyThroughDate, today)
      )
    )
    .returning({ id: specials.id });
  return { archived: result.length };
}
