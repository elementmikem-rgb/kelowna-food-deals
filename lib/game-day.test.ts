import { describe, it, expect } from "vitest";
import { pickNextGame } from "./game-day";
import { buildGameEvents, NHL_TEAMS, type ApiGame } from "./nhl-games";

const van = NHL_TEAMS.find((t) => t.code === "VAN")!;
const mtl = NHL_TEAMS.find((t) => t.code === "MTL")!;

const game = (over: Partial<ApiGame>): ApiGame => ({
  id: 1,
  gameType: 2,
  startTimeUTC: "2026-10-21T02:00:00Z",
  gameScheduleState: "OK",
  venue: { default: "Rogers Arena" },
  homeTeam: { abbrev: "VAN", commonName: { default: "Canucks" } },
  awayTeam: { abbrev: "EDM", commonName: { default: "Oilers" } },
  ...over,
});

describe("buildGameEvents", () => {
  it("builds a home game in the team's local time with the arena", () => {
    const [row] = buildGameEvents(van, [game({})]);
    expect(row).toMatchObject({
      title: "Canucks vs Oilers",
      gameHome: true,
      teamCode: "VAN",
      specificDate: "2026-10-20",
      startTime: "19:00:00",
      locationName: "Rogers Arena",
    });
  });

  it("builds an away game with no location", () => {
    const [row] = buildGameEvents(
      van,
      [game({ homeTeam: { abbrev: "EDM", commonName: { default: "Oilers" } }, awayTeam: { abbrev: "VAN", commonName: { default: "Canucks" } } })]
    );
    expect(row).toMatchObject({ title: "Canucks at Oilers", gameHome: false, locationName: null });
  });

  it("uses French wording for Montreal", () => {
    const [row] = buildGameEvents(
      mtl,
      [game({ homeTeam: { abbrev: "MTL", commonName: { default: "Canadiens" } }, awayTeam: { abbrev: "BUF", commonName: { default: "Sabres" } } })]
    );
    expect(row.title).toBe("Canadiens contre Sabres");
    expect(row.description).toBe("Match de la LNH");
  });

  it("skips preseason and flags postponed games", () => {
    expect(buildGameEvents(van, [game({ gameType: 1 })])).toHaveLength(0);
    expect(buildGameEvents(van, [game({ gameScheduleState: "PPD" })])[0].cancelled).toBe(true);
  });
});

describe("pickNextGame", () => {
  const games = [
    { teamCode: "VAN", gameHome: false, title: "Canucks at Oilers", specificDate: "2026-10-22", startTime: "19:00:00" },
    { teamCode: "EDM", gameHome: true, title: "Oilers vs Canucks", specificDate: "2026-10-22", startTime: "19:00:00" },
    { teamCode: "VAN", gameHome: true, title: "Canucks vs Flames", specificDate: "2026-10-25", startTime: "19:00:00" },
  ];
  it("takes the first game for scope all", () => {
    expect(pickNextGame(["VAN"], "all", games)?.title).toBe("Canucks at Oilers");
  });
  it("skips away games for scope home", () => {
    expect(pickNextGame(["VAN"], "home", games)?.title).toBe("Canucks vs Flames");
  });
  it("takes the earliest across several teams", () => {
    expect(pickNextGame(["VAN", "EDM"], "home", games)?.title).toBe("Oilers vs Canucks");
  });
  it("returns null with no match", () => {
    expect(pickNextGame(["TOR"], "all", games)).toBeNull();
  });
});
