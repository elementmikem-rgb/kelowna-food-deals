// Why the nightly cron should leave a venue alone entirely, or null to scrape it.
// Both reasons exist for the same cause: the cron only ever replaces rows it wrote itself
// (rows with a source_url), so scraping a venue whose listing is maintained by hand adds
// a second copy of every deal next to the hand-entered one.
export function scrapeSkipReason(venue: { claimedAt?: Date | null; manualOnly?: boolean }): string | null {
  // A claimed venue's listing is owner-maintained.
  if (venue.claimedAt) return "venue is owner-claimed";
  // Hand-entered after a manual check (see docs/manual-audit-process.md). Re-checked by hand.
  if (venue.manualOnly) return "venue is manual only (hand-entered listing)";
  return null;
}
