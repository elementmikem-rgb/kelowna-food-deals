// Pure (no database) NHL schedule helpers, split out of lib/nhl-schedule.ts so tests can import them.

// Each tracked NHL team: the region its games are listed in, that region's IANA
// timezone (game dates/times are stored in the region's local time, like every other
// event), and whether the region is French (titles use "contre"/"à").
export const NHL_TEAMS = [
  { code: "VAN", regionSlug: "vancouver", tz: "America/Vancouver", french: false },
  { code: "EDM", regionSlug: "edmonton", tz: "America/Edmonton", french: false },
  { code: "CGY", regionSlug: "calgary", tz: "America/Edmonton", french: false },
  { code: "TOR", regionSlug: "toronto-core", tz: "America/Toronto", french: false },
  { code: "MTL", regionSlug: "montreal-core", tz: "America/Toronto", french: true },
  { code: "OTT", regionSlug: "ottawa", tz: "America/Toronto", french: false },
  { code: "WPG", regionSlug: "winnipeg", tz: "America/Winnipeg", french: false },
] as const;

export type NhlTeam = (typeof NHL_TEAMS)[number];

export const NHL_SEASON = "20262027";

interface ApiTeam {
  abbrev: string;
  commonName: { default: string };
}

export interface ApiGame {
  id: number;
  gameType: number; // 1 preseason, 2 regular season, 3 playoffs
  startTimeUTC: string;
  gameScheduleState?: string; // "OK", "PPD", "CNCL"
  venue?: { default: string };
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
}

export interface GameEventRow {
  gameId: number;
  teamCode: string;
  gameHome: boolean;
  title: string;
  description: string;
  specificDate: string; // YYYY-MM-DD in the region's timezone
  startTime: string; // HH:MM:SS in the region's timezone
  locationName: string | null;
  cancelled: boolean;
}

export function gameNote(gameId: number): string {
  return `source:nhl-api game ${gameId}`;
}

export function scheduleUrl(team: string): string {
  return `https://api-web.nhle.com/v1/club-schedule-season/${team}/${NHL_SEASON}`;
}

export function localParts(iso: string, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

// Pure: turns one team's season schedule into the event rows we want, regular season
// and playoffs only (preseason games don't draw game-day crowds).
export function buildGameEvents(team: NhlTeam, games: ApiGame[]): GameEventRow[] {
  const rows: GameEventRow[] = [];
  for (const g of games) {
    if (g.gameType !== 2 && g.gameType !== 3) continue;
    const home = g.homeTeam.abbrev === team.code;
    const away = g.awayTeam.abbrev === team.code;
    if (!home && !away) continue;
    const mine = home ? g.homeTeam : g.awayTeam;
    const opp = home ? g.awayTeam : g.homeTeam;
    const link = home ? (team.french ? "contre" : "vs") : team.french ? "à" : "at";
    const { date, time } = localParts(g.startTimeUTC, team.tz);
    const playoffs = g.gameType === 3;
    rows.push({
      gameId: g.id,
      teamCode: team.code,
      gameHome: home,
      title: `${mine.commonName.default} ${link} ${opp.commonName.default}`,
      description: team.french
        ? playoffs
          ? "Match des séries de la LNH"
          : "Match de la LNH"
        : playoffs
          ? "NHL playoffs"
          : "NHL regular season",
      specificDate: date,
      startTime: time,
      locationName: home ? (g.venue?.default ?? null) : null,
      cancelled: g.gameScheduleState === "CNCL" || g.gameScheduleState === "PPD",
    });
  }
  return rows;
}

