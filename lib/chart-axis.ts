// Axis maths for the admin analytics chart: a rounded top value, whole-number ticks, and short
// labels for the day or hour buckets along the bottom.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The chart's top value: the next 1, 2 or 5 times a power of ten at or above max, never below 2
// so a quiet window still shows a readable 0 to 2 scale.
export function niceCeil(max: number): number {
  if (max <= 2) return 2;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 5, 10]) {
    if (m * magnitude >= max) return m * magnitude;
  }
  return 10 * magnitude;
}

// Whole-number ticks from 0 up to the top value: halves for a 1 or 2 mantissa, fifths for a 5.
export function yTicks(top: number): number[] {
  const mantissa = top / 10 ** Math.floor(Math.log10(top));
  const step = top === 2 ? 1 : mantissa === 5 ? top / 5 : top / 2;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

// "2026-11-07" -> "Nov 7"; "2026-11-07 15:00" -> "3 PM" (or "Nov 7, 3 PM" with the date).
export function formatBucket(bucket: string, withDate = false): string {
  const [date, time] = bucket.split(" ");
  const [, month, day] = date.split("-").map(Number);
  const dayLabel = `${MONTHS[month - 1]} ${day}`;
  if (!time) return dayLabel;
  const hour = Number(time.slice(0, 2));
  const clock = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "AM" : "PM"}`;
  return withDate ? `${dayLabel}, ${clock}` : clock;
}

// The nearest point to a cursor, given how far across the whole chart it is (0 to 1). The plot
// area is inset by `padding` out of `width` on each side, matching how the chart draws its points.
export function indexAtRatio(ratio: number, count: number, width = 600, padding = 8): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const fraction = Math.min(1, Math.max(0, (ratio * width - padding) / (width - padding * 2)));
  return Math.round(fraction * (count - 1));
}

// Which points get a label along the bottom: all of them when there are few, otherwise up to
// maxLabels spread evenly, always including the first and the last.
export function labelIndices(count: number, maxLabels = 6): number[] {
  if (count <= 0) return [];
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (maxLabels - 1);
  return [...new Set(Array.from({ length: maxLabels }, (_, i) => Math.round(i * step)))];
}

const PACIFIC = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Vancouver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

// The chart's bucket key for an instant, in Pacific time: "2026-11-07" or "2026-11-07 08:00".
function pacificBucket(t: Date, hourly: boolean): string {
  const p = Object.fromEntries(PACIFIC.formatToParts(t).map((x) => [x.type, x.value]));
  const day = `${p.year}-${p.month}-${p.day}`;
  return hourly ? `${day} ${p.hour}:00` : day;
}

// The query only returns buckets that had traffic, so a quiet hour or day would vanish and the
// line would run straight across the gap. This lists every bucket in the window (hourly when it
// spans a day or less, matching the query) and puts a zero where there was no traffic. A row
// outside the window is kept rather than dropped.
export function fillBuckets<T extends { date: string; pageviews: number; visitors: number }>(
  rows: T[],
  from: Date,
  to: Date
): (T | { date: string; pageviews: number; visitors: number })[] {
  const hourly = to.getTime() - from.getTime() <= 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  const byKey = new Map<string, T | { date: string; pageviews: number; visitors: number }>(
    rows.map((r) => [r.date, r])
  );
  // Step an hour at a time so a daylight saving change cannot skip or repeat a day.
  for (let t = Math.floor(from.getTime() / HOUR) * HOUR; t < to.getTime(); t += HOUR) {
    const key = pacificBucket(new Date(t), hourly);
    if (!byKey.has(key)) byKey.set(key, { date: key, pageviews: 0, visitors: 0 });
  }
  return [...byKey.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
