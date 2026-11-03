// "Previously featured" on a venue page only shows deals that were archived recently. Older ones
// read as current claims to the venue (a venue asked us to remove $5 tacos that had been
// archived five weeks earlier), so they drop off after this many days.
export const PREVIOUS_SPECIALS_DAYS = 30;

export function previousSpecialsCutoff(now: Date): Date {
  return new Date(now.getTime() - PREVIOUS_SPECIALS_DAYS * 24 * 60 * 60 * 1000);
}
