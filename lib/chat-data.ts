import { db, chatQueries, venues } from "@/db";
import { and, desc, gte, sql } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";
import { pacificTodayISODate, startOfDayPacific } from "@/lib/time";

export interface ChatQueryRow {
  id: number;
  regionId: number;
  question: string;
  answer: string;
  tokensUsed: number;
  createdAt: Date;
}

export async function getRecentChatQueries(
  regionIds: number[] | "all",
  limit = 200
): Promise<ChatQueryRow[]> {
  const rows = await db
    .select({
      id: chatQueries.id,
      regionId: chatQueries.regionId,
      question: chatQueries.question,
      answer: chatQueries.answer,
      tokensUsed: chatQueries.tokensUsed,
      createdAt: chatQueries.createdAt,
    })
    .from(chatQueries)
    .where(regionScopeCondition(chatQueries.regionId, regionIds))
    .orderBy(desc(chatQueries.createdAt))
    .limit(limit);
  return rows;
}

export interface ChatSummary {
  todayCount: number;
  todayTokens: number;
  weekCount: number;
  weekTokens: number;
  monthCount: number;
  monthTokens: number;
}

function daysAgoISODate(daysAgo: number): string {
  const today = pacificTodayISODate();
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-CA");
}

// Three cheap counting queries rather than one clever windowed aggregate -- this page is
// checked occasionally by a human, not on a hot path, so straightforward beats clever.
export async function getChatSummary(regionIds: number[] | "all"): Promise<ChatSummary> {
  async function windowStats(sinceISODate: string) {
    const [row] = await db
      .select({
        count: sql<number>`count(*)::int`,
        tokens: sql<number>`coalesce(sum(${chatQueries.tokensUsed}), 0)::int`,
      })
      .from(chatQueries)
      .where(
        and(
          regionScopeCondition(chatQueries.regionId, regionIds),
          gte(chatQueries.createdAt, startOfDayPacific(sinceISODate))
        )
      );
    return { count: row?.count ?? 0, tokens: row?.tokens ?? 0 };
  }

  const [today, week, month] = await Promise.all([
    windowStats(pacificTodayISODate()),
    windowStats(daysAgoISODate(6)),
    windowStats(daysAgoISODate(29)),
  ]);

  return {
    todayCount: today.count,
    todayTokens: today.tokens,
    weekCount: week.count,
    weekTokens: week.tokens,
    monthCount: month.count,
    monthTokens: month.tokens,
  };
}

export interface TopVenueMention {
  venueName: string;
  mentionCount: number;
}

// No structured link between a chatQueries row and the venue(s) its answer actually
// named -- that would need a schema change. A case-insensitive substring match against
// this scope's real venue names is a cheap, no-migration approximation: good enough to
// answer "what are people actually asking about", not exact attribution (a short/generic
// venue name can over-match; longer names are reliable).
export async function getTopMentionedVenues(
  regionIds: number[] | "all",
  days = 7
): Promise<TopVenueMention[]> {
  const [venueRows, chatRows] = await Promise.all([
    db
      .select({ name: venues.name })
      .from(venues)
      .where(regionScopeCondition(venues.regionId, regionIds)),
    db
      .select({ question: chatQueries.question, answer: chatQueries.answer })
      .from(chatQueries)
      .where(
        and(
          regionScopeCondition(chatQueries.regionId, regionIds),
          gte(chatQueries.createdAt, startOfDayPacific(daysAgoISODate(days - 1)))
        )
      ),
  ]);

  const counts = new Map<string, number>();
  for (const v of venueRows) {
    const needle = v.name.toLowerCase();
    let count = 0;
    for (const row of chatRows) {
      const haystack = `${row.question} ${row.answer}`.toLowerCase();
      if (haystack.includes(needle)) count++;
    }
    if (count > 0) counts.set(v.name, count);
  }

  return Array.from(counts.entries())
    .map(([venueName, mentionCount]) => ({ venueName, mentionCount }))
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, 20);
}
