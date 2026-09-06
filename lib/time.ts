const PACIFIC_TZ = "America/Vancouver";
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DOW_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function pacificTodayISODate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

export function todayDowPacific(now: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    weekday: "short",
  }).format(now);
  const idx = DOW_NAMES.findIndex((d) => d === weekday);
  return idx === -1 ? now.getUTCDay() : idx;
}

// 0-indexed month in Pacific time. The container runs UTC, so around month
// boundaries new Date().getMonth() names the wrong month for hours at a time.
export function pacificMonthIndex(now: Date = new Date()): number {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    month: "numeric",
  }).format(now);
  const parsed = parseInt(month, 10);
  return Number.isNaN(parsed) ? now.getUTCMonth() : parsed - 1;
}

export function dowShortName(dow: number): string {
  return DOW_NAMES[dow] ?? "?";
}

export function dowFullName(dow: number): string {
  return DOW_FULL[dow] ?? "Unknown";
}

const STALE_DAYS = 60;

export function daysSince(date: Date, now: Date = new Date()): number {
  const ms = now.getTime() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isStale(lastVerifiedAt: Date, now: Date = new Date()): boolean {
  return daysSince(lastVerifiedAt, now) > STALE_DAYS;
}

export function formatVerifiedRelative(lastVerifiedAt: Date, now: Date = new Date()): string {
  const days = daysSince(lastVerifiedAt, now);
  if (days <= 0) return "verified today";
  if (days === 1) return "verified 1 day ago";
  return `verified ${days} days ago`;
}

export function formatTimeOfDay(time: string | null): string | null {
  if (!time) return null;
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${displayHour}${period}` : `${displayHour}:${String(m).padStart(2, "0")}${period}`;
}

export function formatTimeWindow(start: string | null, end: string | null): string | null {
  const s = formatTimeOfDay(start);
  const e = formatTimeOfDay(end);
  if (s && e) return `${s}–${e}`;
  return s ?? e ?? null;
}

export function formatCheckedAt(date: Date): string {
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${datePart}, ${timePart}`;
}
