// A "Mon-Fri happy hour" special is stored as 5 separate rows (one per day —
// see the day-range extraction fix), which is correct for the homepage's
// single-day filter but would render as 5 near-duplicate cards on a venue's
// detail page, which shows all current specials at once with no day filter.
// This collapses same-item rows that differ only by day into one card with a
// human-readable day range label.

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayRangeLabel(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Daily";
  if (sorted.length === 1) return DAY_NAMES[sorted[0]];

  // Contiguous run (e.g. [1,2,3,4,5] -> "Mon-Fri")?
  const isContiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isContiguous) return `${DAY_NAMES[sorted[0]]}-${DAY_NAMES[sorted[sorted.length - 1]]}`;

  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

interface DayGroupable {
  title: string;
  description: string | null;
  priceCents: number | null;
  category: string;
  startTime: string | null;
  endTime: string | null;
  dayOfWeek: number | null;
  venueId?: number | null;
}

export function groupByDayRange<T extends DayGroupable>(items: T[]): (T & { dayLabel: string | null })[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    // venueId is included so a multi-venue caller (e.g. PreviousSpecials, which lists
    // across every active venue) can't collapse two different venues' identically-named
    // specials into one card attributed to only one of them.
    const key = `${item.venueId}|${item.title}|${item.description}|${item.priceCents}|${item.category}|${item.startTime}|${item.endTime}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const result: (T & { dayLabel: string | null })[] = [];
  for (const group of groups.values()) {
    const days = group.map((g) => g.dayOfWeek).filter((d): d is number => d !== null);
    // Mixed null/non-null days in one group shouldn't happen from a single
    // extraction pass, but if it does, fall back to showing every row as-is
    // rather than mislabeling.
    if (days.length !== group.length && days.length !== 0) {
      for (const g of group) result.push({ ...g, dayLabel: null });
      continue;
    }
    result.push({ ...group[0], dayLabel: days.length > 0 ? dayRangeLabel(days) : null });
  }
  return result;
}

// Events' counterpart to groupByDayRange above -- same "N rows, one per day,
// collapse into one card with a day-range label" problem, confirmed live
// 2026-10-09: a venue detail page rendered every weekly-recurring event with
// no day info at all (EventCard never read dayOfWeek, and events were never
// grouped before reaching it), so a visitor saw e.g. "Bingo Night, 7PM" with
// no indication it's Wednesday-only. Kept separate from DayGroupable/
// groupByDayRange rather than generalizing it: events key on eventType/
// coverChargeCents instead of category/priceCents, and carry specificDate +
// monthlyOccurrence, neither of which a special has.
interface EventDayGroupable {
  title: string;
  description: string | null;
  coverChargeCents: number | null;
  eventType: string;
  startTime: string | null;
  endTime: string | null;
  dayOfWeek: number | null;
  specificDate: string | null;
  monthlyOccurrence: string | null;
  venueId?: number | null;
}

export function groupEventsByDayRange<T extends EventDayGroupable>(items: T[]): (T & { dayLabel: string | null })[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${item.venueId}|${item.title}|${item.description}|${item.coverChargeCents}|${item.eventType}|${item.startTime}|${item.endTime}|${item.specificDate}|${item.monthlyOccurrence}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const result: (T & { dayLabel: string | null })[] = [];
  for (const group of groups.values()) {
    const days = group.map((g) => g.dayOfWeek).filter((d): d is number => d !== null);
    if (days.length !== group.length && days.length !== 0) {
      for (const g of group) result.push({ ...g, dayLabel: null });
      continue;
    }
    result.push({ ...group[0], dayLabel: days.length > 0 ? dayRangeLabel(days) : null });
  }
  return result;
}
