// Pacific-day boundaries for the admin analytics. The server runs in UTC, so reading a picked
// date with new Date("2026-11-07T00:00:00") lands at 4 PM the day before, Pacific, while the
// chart groups traffic by Pacific day.

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Vancouver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function pacificParts(t: number): { date: string; hour: string } {
  const p = Object.fromEntries(PARTS.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: p.hour };
}

// The instant a Pacific calendar day starts, from "YYYY-MM-DD". Midnight is 08:00 UTC on
// standard time and 07:00 UTC on daylight time; the clock changes at 2 AM, so midnight itself
// is never skipped or repeated.
export function pacificMidnight(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  for (const offsetHours of [8, 7]) {
    const t = Date.UTC(y, m - 1, d, offsetHours);
    const p = pacificParts(t);
    if (p.date === isoDate && p.hour === "00") return new Date(t);
  }
  return new Date(NaN);
}

// From the start of the first Pacific day to the start of the day after the last one, so the
// last day is included.
export function pacificDayRange(fromISO: string, toISO: string): { from: Date; to: Date } {
  const [y, m, d] = toISO.split("-").map(Number);
  const dayAfter = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { from: pacificMidnight(fromISO), to: pacificMidnight(dayAfter) };
}
