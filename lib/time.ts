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

export function regionTodayISODate(timezone: string, now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: timezone });
}

export function todayDowInRegion(timezone: string, now: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);
  const idx = DOW_NAMES.findIndex((d) => d === weekday);
  return idx === -1 ? now.getUTCDay() : idx;
}

// Pacific-only compatibility wrappers, kept for the admin/booking/cron call
// sites (lib/bookings-data.ts, lib/venues-data.ts, cron/*, app/admin/*,
// app/api/bookings/*, app/advertise/page.tsx, lib/seo.ts) that are explicitly
// out of scope for this task -- they are Pacific-only by design (single-region
// booking/admin logic, not the public per-region "what day is it" display),
// not a bug this task fixes, and converting them is deferred until a real
// non-Pacific region exists (see this task's "Explicitly out of scope" note).
export function pacificTodayISODate(now: Date = new Date()): string {
  return regionTodayISODate(PACIFIC_TZ, now);
}

export function todayDowPacific(now: Date = new Date()): number {
  return todayDowInRegion(PACIFIC_TZ, now);
}

// 0-indexed month in the given timezone. The container runs UTC, so around
// month boundaries new Date().getMonth() names the wrong month for hours at a time.
export function regionMonthIndex(timezone: string, now: Date = new Date()): number {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "numeric",
  }).format(now);
  const parsed = parseInt(month, 10);
  return Number.isNaN(parsed) ? now.getUTCMonth() : parsed - 1;
}

// Hour-of-day (0-23) in Pacific for a given instant.
function pacificHour(at: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    hour: "numeric",
    hourCycle: "h23",
  }).format(at);
  const parsed = parseInt(hour, 10);
  return Number.isNaN(parsed) ? at.getUTCHours() : parsed;
}

// The UTC instant corresponding to 23:59:59.999 *Pacific* time on the given
// YYYY-MM-DD calendar date. Everything user-facing in this codebase is Pacific
// (see regionTodayISODate), so a paid placement that runs "through 2026-10-20"
// must stay live until the end of that Pacific day -- an end-of-day-UTC value
// would take it dark at 16:59/17:59 Pacific, losing the whole dinner service on
// the last paid day.
//
// Pacific is either UTC-7 (PDT) or UTC-8 (PST), so rather than hardcoding an
// offset we build both candidates and keep the one that actually formats back to
// 23:xx on `dateStr` in Pacific. On a DST-transition day exactly one candidate
// satisfies both conditions, which is what makes this correct across the spring
// -forward and fall-back days rather than merely usually right.
export function endOfDayPacific(dateStr: string): Date {
  const base = new Date(`${dateStr}T23:59:59.999Z`).getTime();
  if (Number.isNaN(base)) return new Date(`${dateStr}T23:59:59.999Z`);
  for (const offsetHours of [8, 7]) {
    const candidate = new Date(base + offsetHours * 60 * 60 * 1000);
    if (regionTodayISODate(PACIFIC_TZ, candidate) === dateStr && pacificHour(candidate) === 23) {
      return candidate;
    }
  }
  // Unreachable while America/Vancouver stays a -7/-8 zone; fall back to the old
  // UTC end-of-day rather than throwing inside an activation path.
  return new Date(base);
}

// The UTC instant corresponding to 00:00:00.000 *Pacific* time on the given
// YYYY-MM-DD calendar date -- the start-of-day counterpart to endOfDayPacific
// above, used to build a Pacific-calendar-day date range for the admin tip
// calculator rather than a UTC-day one that drifts by 7-8 hours.
export function startOfDayPacific(dateStr: string): Date {
  const base = new Date(`${dateStr}T00:00:00.000Z`).getTime();
  if (Number.isNaN(base)) return new Date(`${dateStr}T00:00:00.000Z`);
  for (const offsetHours of [8, 7]) {
    const candidate = new Date(base + offsetHours * 60 * 60 * 1000);
    if (regionTodayISODate(PACIFIC_TZ, candidate) === dateStr && pacificHour(candidate) === 0) {
      return candidate;
    }
  }
  return new Date(base);
}

// Inclusive day count between two YYYY-MM-DD dates (e.g. the same day is 1 day,
// not 0) -- shared by the booking checkout price calc and its pre-checkout
// preview so the two can never quote a different total for the same range.
export function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
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
