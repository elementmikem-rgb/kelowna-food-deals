// One-line descriptions of a venue's specials for the inbox venue panel.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayName(dow: number | null): string {
  return dow === null || dow < 0 || dow > 6 ? "Daily" : DAYS[dow];
}

// Times come back from the database as HH:MM:SS.
function hhmm(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

export interface SpecialLine {
  title: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  priceCents: number | null;
}

export function formatSpecialLine(s: SpecialLine): string {
  const start = hhmm(s.startTime);
  const end = hhmm(s.endTime);
  const when =
    start && end
      ? `${dayName(s.dayOfWeek)} ${start} to ${end}`
      : start
        ? `${dayName(s.dayOfWeek)} from ${start}`
        : dayName(s.dayOfWeek);
  return [when, s.priceCents !== null ? dollars(s.priceCents) : null, s.title].filter(Boolean).join(", ");
}

export interface SpecialSummary {
  title: string;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  priceCents: number | null;
}

// Like formatSpecialLine, for a suggestion that may cover several days.
export function formatSpecialSummary(s: SpecialSummary): string {
  const days = [...new Set(s.daysOfWeek)].sort((a, b) => a - b);
  const dayText = days.length === 0 || days.length === 7 ? "Daily" : days.map((d) => dayName(d)).join(", ");
  const start = hhmm(s.startTime);
  const end = hhmm(s.endTime);
  const when = start && end ? `${dayText} ${start} to ${end}` : start ? `${dayText} from ${start}` : dayText;
  return [when, s.priceCents !== null ? dollars(s.priceCents) : null, s.title].filter(Boolean).join(", ");
}
