// Per-token USD pricing for models this app calls (cron/extract.ts, cron/vision.ts).
// Anthropic's standard prompt-caching rates: a cache write costs ~1.25x a normal input
// token (writing the cache costs a little extra), a cache read costs ~0.1x (the whole
// point of caching). Update this file if the model or its published pricing changes --
// nothing else derives these numbers.
export const HAIKU_4_5_PRICE_PER_TOKEN = {
  input: 1 / 1_000_000,
  output: 5 / 1_000_000,
  cacheWrite: 1.25 / 1_000_000,
  cacheRead: 0.1 / 1_000_000,
};

// cron/extract.ts and cron/vision.ts switched models here (commit 29a10f9, 2026-10-08
// 08:46 Pacific) -- 90% cheaper than Haiku 4.5. A scrape_runs row from before this
// moment was genuinely billed at the 4.5 rate above; one from after was billed at this
// rate. estimateCostUsd below picks the right table by comparing the row's own ranAt
// against this cutover, so historical cost figures (e.g. the admin scrape-health
// dashboard's 14-day/month-to-date totals) stay accurate across the switch instead of
// silently re-pricing pre-switch days at the new, much cheaper rate.
export const HAIKU_5_5_PRICE_PER_TOKEN = {
  input: 0.10 / 1_000_000,
  output: 0.50 / 1_000_000,
  cacheWrite: 0.125 / 1_000_000,
  cacheRead: 0.01 / 1_000_000,
};

export const HAIKU_5_5_CUTOVER_AT = new Date("2026-10-08T15:46:11Z"); // 08:46:11 -0700

export interface TokenBreakdown {
  totalTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
}

// `totalTokens` (scrapeRuns.tokensUsed) is input + output + cache-write + cache-read
// combined (see cron/extract.ts) -- the plain "uncached input" count isn't stored on its
// own, so it's derived here as the remainder. Pre-caching rows (cacheCreationTokens etc.
// null) fall through to that same subtraction with the cache fields at 0, which is exactly
// right for them: nothing was cached, so total - output IS the uncached input.
//
// `ranAt` picks which model's pricing applies (see HAIKU_5_5_CUTOVER_AT above) --
// required, not optional, so a caller can't accidentally price a mixed-era aggregate at
// a single flat rate. A caller summing tokens across a date range that straddles the
// cutover must split the query at the boundary and call this once per side, then add
// the two dollar amounts -- summing tokens first and pricing once would blend two
// different per-token rates into a wrong number either way.
export function estimateCostUsd(t: TokenBreakdown, ranAt: Date): number {
  const prices = ranAt < HAIKU_5_5_CUTOVER_AT ? HAIKU_4_5_PRICE_PER_TOKEN : HAIKU_5_5_PRICE_PER_TOKEN;

  const cacheCreation = t.cacheCreationTokens ?? 0;
  const cacheRead = t.cacheReadTokens ?? 0;
  const output = t.outputTokens ?? 0;
  const uncachedInput = Math.max(0, t.totalTokens - output - cacheCreation - cacheRead);

  return (
    uncachedInput * prices.input +
    cacheCreation * prices.cacheWrite +
    cacheRead * prices.cacheRead +
    output * prices.output
  );
}
