// Date and count formatting for the admin inbox.
// All functions accept an explicit `now` for deterministic output on both
// server and browser -- never call new Date() implicitly inside these.

const DEFAULT_TZ = "America/Vancouver";

// Return the YYYY-MM-DD calendar date for `d` in the given timezone.
function calendarDate(d: Date, tz: string): string {
  return d.toLocaleDateString("en-CA", { timeZone: tz });
}

// Return the 4-digit year string for `d` in the given timezone.
function calendarYear(d: Date, tz: string): string {
  return calendarDate(d, tz).slice(0, 4);
}

// Gmail-style compact date for thread list rows:
//   Same calendar day in tz    -> "3:42 PM"
//   Same calendar year         -> "Nov 19"
//   Older                      -> "Nov 19, 2024"
export function formatListDate(
  iso: string,
  now: Date = new Date(),
  tz = DEFAULT_TZ
): string {
  const d = new Date(iso);

  if (calendarDate(d, tz) === calendarDate(now, tz)) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  if (calendarYear(d, tz) === calendarYear(now, tz)) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
    }).format(d);
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// Human-readable relative time between `d` and `now`.
function relativeTime(d: Date, now: Date): string {
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 60_000) return "just now";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

// Full date + time + relative age for the message detail header:
//   "Nov 19, 2026, 7:13 AM (3 days ago)"
export function formatMessageDate(
  iso: string,
  now: Date = new Date(),
  tz = DEFAULT_TZ
): string {
  const d = new Date(iso);

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);

  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  const rel = relativeTime(d, now);
  return `${datePart}, ${timePart} (${rel})`;
}

// Pagination label: "1-50 of 120", "0 of 0" when empty.
// `start` is the 1-based index of the first shown row (default 1).
export function formatCount(shown: number, total: number, start = 1): string {
  if (total === 0) return "0 of 0";
  const end = start + shown - 1;
  return `${start}-${end} of ${total}`;
}
