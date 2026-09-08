import { db, specials, venues, dealFeedback } from "@/db";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

export interface FlaggedSpecial {
  id: number;
  title: string;
  venueName: string;
  disputeCount: number;
}

export async function getFlaggedSpecials(): Promise<FlaggedSpecial[]> {
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
    .where(and(eq(dealFeedback.kind, "special"), eq(dealFeedback.feedbackType, "dispute"), isNull(specials.archivedAt)))
    .groupBy(specials.id, specials.title, venues.name)
    .orderBy(desc(sql`count(${dealFeedback.id})`));

  return rows;
}
