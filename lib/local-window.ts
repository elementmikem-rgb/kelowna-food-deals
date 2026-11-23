// Whether it is currently a sensible time of day to email someone, in THEIR timezone. House rule: outreach lands in
// the recipient's morning (around 9:30 local), never in a burst at some other hour.

export function localHour(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, hour: "numeric", hour12: false }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  // Some engines write midnight as 24.
  return h === 24 ? 0 : h;
}

export function inLocalWindow(now: Date, timeZone: string, startHour = 9, endHour = 11): boolean {
  try {
    const h = localHour(now, timeZone);
    return h >= startHour && h < endHour;
  } catch {
    return false;
  }
}
