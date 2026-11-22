// Snooze rules for the admin inbox. Pure so they are tested; all "local" times are Vancouver time.

const TZ = "America/Vancouver";

export type SnoozePreset = "later_today" | "tomorrow" | "in_3_days" | "next_week";

export const SNOOZE_PRESETS: { id: SnoozePreset; label: string; hint: string }[] = [
  { id: "later_today", label: "Later today", hint: "In 3 hours" },
  { id: "tomorrow", label: "Tomorrow", hint: "9:00 AM" },
  { id: "in_3_days", label: "In 3 days", hint: "9:00 AM" },
  { id: "next_week", label: "Next week", hint: "Monday 9:00 AM" },
];

const WAKE_HOUR = 9;

// Offset (ms) between UTC and the Vancouver wall clock at a given instant: local = utc + offset.
function tzOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

// The UTC instant at which the Vancouver wall clock reads y-m-d h:00.
function vancouverToUtc(y: number, m: number, d: number, h: number): Date {
  const guess = Date.UTC(y, m - 1, d, h, 0, 0);
  // Two passes handle the hour that changes across a daylight saving boundary.
  const first = guess - tzOffsetMs(new Date(guess));
  return new Date(guess - tzOffsetMs(new Date(first)));
}

// Calendar date and weekday (0 = Sunday) of an instant on the Vancouver wall clock.
function vancouverDate(at: Date): { y: number; m: number; d: number; dow: number } {
  const local = new Date(at.getTime() + tzOffsetMs(at));
  return { y: local.getUTCFullYear(), m: local.getUTCMonth() + 1, d: local.getUTCDate(), dow: local.getUTCDay() };
}

function addDays(y: number, m: number, d: number, n: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function snoozeUntilFor(preset: SnoozePreset, now: Date = new Date()): Date {
  if (preset === "later_today") return new Date(now.getTime() + 3 * 3600_000);
  const today = vancouverDate(now);
  let days: number;
  if (preset === "tomorrow") days = 1;
  else if (preset === "in_3_days") days = 3;
  else {
    // The coming Monday; if that is tomorrow (today is Sunday), the Monday after, so "next week" is never "tomorrow".
    const untilMonday = (8 - today.dow) % 7 || 7;
    days = untilMonday === 1 ? 8 : untilMonday;
  }
  const t = addDays(today.y, today.m, today.d, days);
  return vancouverToUtc(t.y, t.m, t.d, WAKE_HOUR);
}

export interface SnoozeState {
  snoozedUntil: string | null;
  updatedAt: string; // when the snooze was set
}

// A conversation is hidden while its wake time is in the future, unless the venue replied after the snooze was
// set: a reply wakes it early, so "remind me" never buries an answer.
export function isSnoozedNow(state: SnoozeState | null, lastInboundAt: string | null, now: Date = new Date()): boolean {
  if (!state || !state.snoozedUntil) return false;
  if (new Date(state.snoozedUntil).getTime() <= now.getTime()) return false;
  if (lastInboundAt && new Date(lastInboundAt).getTime() > new Date(state.updatedAt).getTime()) return false;
  return true;
}
