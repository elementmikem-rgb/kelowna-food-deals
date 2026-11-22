// One-line descriptions of a venue's specials for the inbox venue panel.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayName(dow: number | null): string {
  return dow === null || dow < 0 || dow > 6 ? "Daily" : DAYS[dow];
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
  const when =
    s.startTime && s.endTime
      ? `${dayName(s.dayOfWeek)} ${s.startTime} to ${s.endTime}`
      : s.startTime
        ? `${dayName(s.dayOfWeek)} from ${s.startTime}`
        : dayName(s.dayOfWeek);
  return [when, s.priceCents !== null ? dollars(s.priceCents) : null, s.title].filter(Boolean).join(", ");
}
