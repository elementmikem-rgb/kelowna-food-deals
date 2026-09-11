import { db, specials, events, venues, dealFeedback } from "@/db";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";

export interface FlaggedSpecial {
  id: number;
  title: string;
  venueName: string;
  disputeCount: number;
}

export async function getFlaggedSpecials(regionIds: number[] | "all"): Promise<FlaggedSpecial[]> {
  const rows = await db
    .select({
      id: specials.id,
      title: specials.title,
      venueName: venues.name,
      disputeCount: sql<number>`count(${dealFeedback.id})::int`,
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
}

export async function getFlaggedEvents(regionIds: number[] | "all"): Promise<FlaggedEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      venueName: venues.name,
      disputeCount: sql<number>`count(${dealFeedback.id})::int`,
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
