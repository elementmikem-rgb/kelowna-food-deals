import { db, specials, events, venues, dealFeedback, type DealFeedbackReason } from "@/db";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";

export interface FlaggedReasonEntry {
  reason: DealFeedbackReason | null;
  note: string | null;
}

export interface FlaggedSpecial {
  id: number;
  title: string;
  venueName: string;
  disputeCount: number;
  reasons: FlaggedReasonEntry[];
}

// One aggregate row per item id/title/venue plus a json-agg'd array of every
// dispute's (reason, note) -- admin needs to see WHY each report was filed,
// not just a count, so the reason data has to travel with the grouped row
// rather than a separate query per item.
export async function getFlaggedSpecials(regionIds: number[] | "all"): Promise<FlaggedSpecial[]> {
  const rows = await db
    .select({
      id: specials.id,
      title: specials.title,
      venueName: venues.name,
      disputeCount: sql<number>`count(${dealFeedback.id})::int`,
      reasons: sql<FlaggedReasonEntry[]>`
        json_agg(json_build_object('reason', ${dealFeedback.reason}, 'note', ${dealFeedback.note}) order by ${dealFeedback.createdAt} desc)
      `,
    })
    .from(dealFeedback)
    .innerJoin(specials, eq(specials.id, dealFeedback.itemId))
    .innerJoin(venues, eq(venues.id, specials.venueId))
    .where(
      and(
        eq(dealFeedback.kind, "special"),
        eq(dealFeedback.feedbackType, "dispute"),
        isNull(specials.archivedAt),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .groupBy(specials.id, specials.title, venues.name)
    .orderBy(desc(sql`count(${dealFeedback.id})`));

  return rows;
}

export interface FlaggedEvent {
  id: number;
  title: string;
  venueName: string;
  disputeCount: number;
  reasons: FlaggedReasonEntry[];
}

export async function getFlaggedEvents(regionIds: number[] | "all"): Promise<FlaggedEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      venueName: venues.name,
      disputeCount: sql<number>`count(${dealFeedback.id})::int`,
      reasons: sql<FlaggedReasonEntry[]>`
        json_agg(json_build_object('reason', ${dealFeedback.reason}, 'note', ${dealFeedback.note}) order by ${dealFeedback.createdAt} desc)
      `,
    })
    .from(dealFeedback)
    .innerJoin(events, eq(events.id, dealFeedback.itemId))
    .innerJoin(venues, eq(venues.id, events.venueId))
    .where(
      and(
        eq(dealFeedback.kind, "event"),
        eq(dealFeedback.feedbackType, "dispute"),
        isNull(events.archivedAt),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .groupBy(events.id, events.title, venues.name)
    .orderBy(desc(sql`count(${dealFeedback.id})`));

  return rows;
}
