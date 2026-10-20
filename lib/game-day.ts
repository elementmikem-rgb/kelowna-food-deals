import { db, events, specials, venues, regions } from "@/db";
import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { GameScope } from "@/db/schema";
import { pacificTodayISODate } from "@/lib/time";

export interface NextGame {
  title: string;
  date: string; // YYYY-MM-DD, in the team's region's local time
  time: string | null;
}

export interface GameDayDeal {
  specialId: number;
  title: string;
  venueId: number;
  venueName: string;
  regionSlug: string;
}

// How far ahead a "next game" is worth showing. Past this (the offseason) the card just
// shows the game-day badge with no date rather than a months-away game.
const NEXT_GAME_WINDOW_DAYS = 45;

interface GameRow {
  teamCode: string | null;
  gameHome: boolean | null;
  title: string;
  specificDate: string | null;
  startTime: string | null;
}

// Pure: the earliest game among the teams a special follows that its scope allows.
// `games` must already be ordered by date then time.
export function pickNextGame(
  teams: string[],
  scope: GameScope | null,
  games: GameRow[]
): NextGame | null {
  for (const g of games) {
    if (!g.teamCode || !g.specificDate || !teams.includes(g.teamCode)) continue;
    if (scope === "home" && g.gameHome !== true) continue;
    return { title: g.title, date: g.specificDate, time: g.startTime };
  }
  return null;
}

// Adds `nextGame` to every row that follows NHL teams. One query for the whole list, and
// none at all when no row is a game-day deal (the common case).
export async function attachNextGames<
  T extends { gameTeams: string[] | null; gameScope: GameScope | null },
>(rows: T[]): Promise<(T & { nextGame: NextGame | null })[]> {
  const codes = [...new Set(rows.flatMap((r) => r.gameTeams ?? []))];
  if (codes.length === 0) return rows.map((r) => ({ ...r, nextGame: null }));

  const today = pacificTodayISODate();
  const until = new Date();
  until.setDate(until.getDate() + NEXT_GAME_WINDOW_DAYS);
  const games = await db
    .select({
      teamCode: events.teamCode,
      gameHome: events.gameHome,
      title: events.title,
      specificDate: events.specificDate,
      startTime: events.startTime,
    })
    .from(events)
    .where(
      and(
        inArray(events.teamCode, codes),
        isNull(events.archivedAt),
        gte(events.specificDate, today),
        lte(events.specificDate, until.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" }))
      )
    )
    .orderBy(asc(events.specificDate), asc(events.startTime));

  return rows.map((r) => ({
    ...r,
    nextGame: r.gameTeams?.length ? pickNextGame(r.gameTeams, r.gameScope, games) : null,
  }));
}

// For NHL game events: the venues running a game-day deal for that team (home games
// only count for "home"-scope deals). Keyed by team code + home flag so the lookup is
// one query per list, however many games it holds.
export async function getGameDayDealsByTeam(
  teamCodes: string[]
): Promise<Map<string, GameDayDeal[]>> {
  const out = new Map<string, GameDayDeal[]>();
  if (teamCodes.length === 0) return out;
  const rows = await db
    .select({
      specialId: specials.id,
      title: specials.title,
      venueId: venues.id,
      venueName: venues.name,
      regionSlug: regions.slug,
      gameTeams: specials.gameTeams,
      gameScope: specials.gameScope,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .innerJoin(regions, eq(venues.regionId, regions.id))
    .where(
      and(
        eq(venues.active, true),
        isNull(specials.archivedAt),
        sql`${specials.gameTeams} && ${sql.raw(`ARRAY[${teamCodes.map((c) => `'${c.replace(/'/g, "")}'`).join(",")}]::text[]`)}`
      )
    );
  for (const r of rows) {
    for (const code of r.gameTeams ?? []) {
      for (const home of [true, false]) {
        if (r.gameScope === "home" && !home) continue;
        const key = `${code}:${home}`;
        const list = out.get(key) ?? [];
        // One entry per venue is enough -- a venue's several tagged specials all
        // belong to the same night.
        if (!list.some((d) => d.venueId === r.venueId)) {
          list.push({
            specialId: r.specialId,
            title: r.title,
            venueId: r.venueId,
            venueName: r.venueName,
            regionSlug: r.regionSlug,
          });
        }
        out.set(key, list);
      }
    }
  }
  return out;
}

export function dealsForGame(
  byTeam: Map<string, GameDayDeal[]>,
  teamCode: string | null,
  gameHome: boolean | null,
  limit = 4
): GameDayDeal[] {
  if (!teamCode || gameHome === null) return [];
  return (byTeam.get(`${teamCode}:${gameHome}`) ?? []).slice(0, limit);
}
