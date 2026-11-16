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
