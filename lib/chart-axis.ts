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
