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
export function estimateCostUsd(t: TokenBreakdown): number {
  const cacheCreation = t.cacheCreationTokens ?? 0;
  const cacheRead = t.cacheReadTokens ?? 0;
  const output = t.outputTokens ?? 0;
  const uncachedInput = Math.max(0, t.totalTokens - output - cacheCreation - cacheRead);

  return (
    uncachedInput * HAIKU_4_5_PRICE_PER_TOKEN.input +
    cacheCreation * HAIKU_4_5_PRICE_PER_TOKEN.cacheWrite +
    cacheRead * HAIKU_4_5_PRICE_PER_TOKEN.cacheRead +
    output * HAIKU_4_5_PRICE_PER_TOKEN.output
  );
}
