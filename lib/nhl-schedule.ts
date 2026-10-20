import { db, events, regions } from "@/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  NHL_TEAMS,
  buildGameEvents,
  gameNote,
  localParts,
  scheduleUrl,
  type ApiGame,
  type GameEventRow,
} from "./nhl-games";

async function fetchSchedule(team: string): Promise<ApiGame[]> {
  const res = await fetch(scheduleUrl(team), { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`NHL API ${team}: HTTP ${res.status}`);
  const json = (await res.json()) as { games?: ApiGame[] };
  return json.games ?? [];
}

function todayIn(tz: string): string {
  return localParts(new Date().toISOString(), tz).date;
}

// Keeps the NHL game events in step with the league's schedule: fills in teamCode/
// gameHome on existing rows, corrects date/time/title when a game moves, inserts newly
// scheduled games (playoffs, schedule additions) and archives postponed/cancelled ones.
// Only touches today-and-later games, and never a row an admin archived by hand.
export async function refreshNhlSchedule(
  opts: { dryRun?: boolean } = {}
): Promise<{ inserted: number; updated: number; archived: number; teamsFailed: string[] }> {
  const regionRows = await db
    .select({ id: regions.id, slug: regions.slug })
    .from(regions)
    .where(inArray(regions.slug, NHL_TEAMS.map((t) => t.regionSlug)));
  const regionIdBySlug = new Map(regionRows.map((r) => [r.slug, r.id]));

  let inserted = 0;
  let updated = 0;
  let archived = 0;
  const teamsFailed: string[] = [];

  for (const team of NHL_TEAMS) {
    const regionId = regionIdBySlug.get(team.regionSlug);
    if (!regionId) {
      teamsFailed.push(team.code);
      continue;
    }
    let wanted: GameEventRow[];
    try {
      wanted = buildGameEvents(team, await fetchSchedule(team.code));
    } catch (err) {
      console.error(`NHL schedule ${team.code} failed:`, err instanceof Error ? err.message : err);
      teamsFailed.push(team.code);
      continue;
    }

    const today = todayIn(team.tz);
    const existing = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.regionId, regionId),
          eq(events.eventType, "sports_night"),
          isNull(events.venueId)
        )
      );
    const byNote = new Map(existing.map((e) => [e.extractionNotes, e]));
    const now = new Date();
    const unchangedIds: number[] = [];

    for (const w of wanted) {
      if (w.specificDate < today) continue;
      const row = byNote.get(gameNote(w.gameId));
      if (!row) {
        if (w.cancelled) continue;
        if (!opts.dryRun) {
          await db.insert(events).values({
            venueId: null,
            regionId,
            title: w.title,
            description: w.description,
            eventType: "sports_night",
            specificDate: w.specificDate,
            startTime: w.startTime,
            locationName: w.locationName,
            lastVerifiedAt: now,
            sourceUrl: scheduleUrl(team.code),
            confidence: 1,
            extractionNotes: gameNote(w.gameId),
            teamCode: w.teamCode,
            gameHome: w.gameHome,
          });
        }
        inserted++;
        continue;
      }
      if (row.archivedManually) continue;
      if (w.cancelled) {
        if (row.archivedAt === null) {
          if (!opts.dryRun) await db.update(events).set({ archivedAt: now }).where(eq(events.id, row.id));
          archived++;
        }
        continue;
      }
      const sameTime = (row.startTime ?? "").slice(0, 8) === w.startTime;
      const changed =
        row.title !== w.title ||
        row.specificDate !== w.specificDate ||
        !sameTime ||
        (row.locationName ?? null) !== w.locationName ||
        row.teamCode !== w.teamCode ||
        row.gameHome !== w.gameHome;
      if (changed) {
        if (!opts.dryRun) {
          await db
            .update(events)
            .set({
              title: w.title,
              specificDate: w.specificDate,
              startTime: w.startTime,
              locationName: w.locationName,
              teamCode: w.teamCode,
              gameHome: w.gameHome,
              lastVerifiedAt: now,
            })
            .where(eq(events.id, row.id));
        }
        updated++;
      } else {
        unchangedIds.push(row.id);
      }
    }
    if (!opts.dryRun && unchangedIds.length > 0) {
      await db.update(events).set({ lastVerifiedAt: now }).where(inArray(events.id, unchangedIds));
    }
  }
  return { inserted, updated, archived, teamsFailed };
}
