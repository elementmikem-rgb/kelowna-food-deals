// Weekly opening hours for a venue. Stored as JSON in venues.opening_hours.
//
// Keys are weekday numbers as strings, "0" = Sunday ... "6" = Saturday (the same numbering the
// specials table uses). A value is null for a closed day, or a list of [open, close] pairs in
// 24-hour "HH:MM" (more than one pair = a split shift). A close time at or before the open time
// means the venue closes after midnight.

export type TimeRange = [string, string];
export type OpeningHours = Record<string, TimeRange[] | null>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export function parseOpeningHours(value: unknown): OpeningHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const out: OpeningHours = {};
  let anyOpen = false;
  for (const key of DAY_KEYS) {
    if (!(key in input)) return null;
    const day = input[key];
    if (day === null) {
      out[key] = null;
      continue;
    }
    if (!Array.isArray(day) || day.length === 0) return null;
    const ranges: TimeRange[] = [];
    for (const r of day) {
      if (!Array.isArray(r) || r.length !== 2) return null;
      const [open, close] = r;
      if (typeof open !== "string" || typeof close !== "string") return null;
      if (!TIME_RE.test(open) || !TIME_RE.test(close)) return null;
      ranges.push([open, close]);
    }
    out[key] = ranges;
    anyOpen = true;
  }
  return anyOpen ? out : null;
}

// Builds a full week from the compact form the extraction model returns: groups of weekdays that
// share a time range. open and close both null means closed on those days. A day nothing
// mentions is UNKNOWN, not closed, so a partly covered week is rejected (null) rather than
// guessed. Every group must also be well formed and a day cannot be both closed and open.
export function hoursFromEntries(entries: unknown): OpeningHours | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const week: Record<string, TimeRange[] | null | undefined> = {};
  for (const e of entries) {
    if (!e || typeof e !== "object") return null;
    const { days_of_week, open, close } = e as { days_of_week?: unknown; open?: unknown; close?: unknown };
    if (!Array.isArray(days_of_week) || days_of_week.length === 0) return null;
    const closed = open === null && close === null;
    if (!closed && (typeof open !== "string" || typeof close !== "string" || !TIME_RE.test(open) || !TIME_RE.test(close))) {
      return null;
    }
    for (const d of days_of_week) {
      if (!Number.isInteger(d) || d < 0 || d > 6) return null;
      const key = String(d);
      const current = week[key];
      if (closed) {
        if (current !== undefined) return null;
        week[key] = null;
      } else {
        if (current === null) return null;
        (week[key] ??= []).push([open as string, close as string]);
      }
    }
  }
  const out: OpeningHours = {};
  for (const key of DAY_KEYS) {
    const day = week[key];
    if (day === undefined) return null;
    out[key] = day;
  }
  return parseOpeningHours(out);
}

// Does this time ("HH:MM", 24-hour) appear in the quote in any common spelling: 11 am, 11:30am,
// 9:30 p.m., 22:00, noon, midnight? `text` must already be lowercased. Used to check that a quote
// really contains every time the model reported, so a short fragment cannot back a whole week.
export function timeAppearsIn(text: string, time: string): boolean {
  const [hh, mm] = time.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (h === 12 && m === 0 && /\bnoon\b/.test(text)) return true;
  if (h === 0 && m === 0 && /\bmidnight\b/.test(text)) return true;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? "(?:pm|p\\.m\\.?)" : "(?:am|a\\.m\\.?)";
  const twelve = new RegExp(`(?<![\\d:])${h12}${m === 0 ? "(?::00)?" : `:${mm}`}\\s*${suffix}(?![a-z])`);
  if (twelve.test(text)) return true;
  const twentyFour = new RegExp(`(?<![\\d:])0?${h}:${mm}(?!\\d)`);
  return twentyFour.test(text);
}

// English day tokens (full or abbreviated) and French full names, mapped to 0 = Sunday ... 6 = Saturday.
// No trailing word boundary on purpose: pages glue the time to the day ("Monday11 AM").
const DAY_TOKEN =
  /\b(?:(mon)(?:day|s)?|(tue)(?:sday|s)?|(wed)(?:nesday|s)?|(thu)(?:rsday|rs|r|s)?|(fri)(?:day|s)?|(sat)(?:urday|s)?|(sun)(?:day|s)?|(lundi)|(mardi)|(mercredi)|(jeudi)|(vendredi)|(samedi)|(dimanche))(?![a-z])/g;
const TOKEN_DAYS = [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0];
const DAILY_WORD = /\b(daily|every ?day|7 days|seven days|tous les jours|quotidienne?|chaque jour)\b/;
const RANGE_JOINER = /^\s*(?:-|–|—|to|through|thru|until|au|à)\s*$/;

// The set of weekdays a quote actually accounts for: days it names, days inside a range such as
// "Mon - Fri", and everything when it says "daily". `text` must be lowercased.
export function daysCoveredByQuote(text: string): Set<number> {
  const covered = new Set<number>();
  if (DAILY_WORD.test(text)) for (let d = 0; d < 7; d++) covered.add(d);
  if (/\bweekdays?\b/.test(text)) [1, 2, 3, 4, 5].forEach((d) => covered.add(d));
  if (/\bweekends?\b/.test(text)) [0, 6].forEach((d) => covered.add(d));
  const tokens: { day: number; start: number; end: number }[] = [];
  for (const m of text.matchAll(DAY_TOKEN)) {
    const group = m.findIndex((g, i) => i > 0 && g !== undefined) - 1;
    tokens.push({ day: TOKEN_DAYS[group], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  tokens.forEach((t, i) => {
    covered.add(t.day);
    const next = tokens[i + 1];
    if (next && RANGE_JOINER.test(text.slice(t.end, next.start))) {
      for (let d = t.day; ; d = (d + 1) % 7) {
        covered.add(d);
        if (d === next.day) break;
      }
    }
  });
  return covered;
}

// True when the quote contains every distinct time the hours use AND accounts for all seven days
// (so a page that lists only Mon and Tue cannot back a full week the model extrapolated).
export function quoteSupportsHours(quote: string, hours: OpeningHours): boolean {
  const text = quote.toLowerCase();
  if (daysCoveredByQuote(text).size < 7) return false;
  const times = new Set<string>();
  for (const ranges of Object.values(hours)) for (const [open, close] of ranges ?? []) { times.add(open); times.add(close); }
  for (const t of times) if (!timeAppearsIn(text, t)) return false;
  return true;
}

export function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${mStr} ${suffix}`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Display order: Monday first, Sunday last.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface HoursRow {
  dow: number;
  day: string;
  text: string;
  isToday: boolean;
}

export function hoursRows(hours: OpeningHours, todayDow?: number): HoursRow[] {
  return DISPLAY_ORDER.map((dow) => {
    const ranges = hours[String(dow)];
    return {
      dow,
      day: DAY_NAMES[dow],
      text: ranges ? ranges.map(([o, c]) => `${formatTime12(o)} to ${formatTime12(c)}`).join(", ") : "Closed",
      isToday: todayDow === dow,
    };
  });
}

export interface OpeningHoursSpec {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
}

export function openingHoursJsonLd(hours: OpeningHours): OpeningHoursSpec[] {
  const specs: OpeningHoursSpec[] = [];
  for (const dow of DISPLAY_ORDER) {
    const ranges = hours[String(dow)];
    if (!ranges) continue;
    for (const [opens, closes] of ranges) {
      specs.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DAY_NAMES[dow]}`,
        opens,
        closes,
      });
    }
  }
  return specs;
}
