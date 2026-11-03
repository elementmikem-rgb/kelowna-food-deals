// Rules for the /[region]/nightlife page: which specials and events count as "night out".
// Pure functions so the cutoffs are testable and easy to change in one place.
import type { EventType } from "@/db/schema";

// Cutoffs, in minutes after midnight. Late special: starts at 8pm or later, runs past 10pm,
// or wraps past midnight. Night event: starts at 7pm or later.
const LATE_START = 20 * 60;
const LATE_END = 22 * 60;
const EVENT_START = 19 * 60;
const NOON = 12 * 60;

function toMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isLateSpecial(startTime: string | null, endTime: string | null): boolean {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start !== null && start >= LATE_START) return true;
  if (end === null) return false;
  if (start !== null && end < start) return true; // wraps past midnight
  // An all-day deal that merely closes late (11am to 11:59pm) is not a night special.
  if (start !== null && start < NOON) return false;
  return end > LATE_END;
}

export type NightEventKind = "music" | "karaoke" | "other";

// Event rows typed "other" are a grab bag (NHL games, markets, seminars), so they only count
// when the title or description reads like a night out.
const NIGHT_WORDS = /\b(dj|dance|party|night ?club|club night|drag|burlesque|ladies night|late ?night|comedy|open mic)\b/i;

export function nightEventKind(e: {
  eventType: EventType | string;
  startTime: string | null;
  title: string;
  description: string | null;
  teamCode: string | null;
}): NightEventKind | null {
  if (e.teamCode) return null;
  const start = toMinutes(e.startTime);
  if (start === null || start < EVENT_START) return null;
  if (e.eventType === "live_music") return "music";
  if (e.eventType === "karaoke") return "karaoke";
  if (e.eventType === "other" && NIGHT_WORDS.test(`${e.title} ${e.description ?? ""}`)) return "other";
  return null;
}
