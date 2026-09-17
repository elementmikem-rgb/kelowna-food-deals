import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "./anthropic-pricing";

describe("estimateCostUsd", () => {
  it("prices a pre-caching row (no cache fields) as plain input + output", () => {
    // 1000 input + 200 output tokens, nothing cached.
    const cost = estimateCostUsd({
      totalTokens: 1200,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 200,
    });
    expect(cost).toBeCloseTo(1000 * (1 / 1_000_000) + 200 * (5 / 1_000_000), 10);
  });

  it("treats null cache fields the same as 0 (rows logged before caching shipped)", () => {
    const cost = estimateCostUsd({
      totalTokens: 1200,
      cacheCreationTokens: null as unknown as number,
      cacheReadTokens: null as unknown as number,
      outputTokens: 200,
    });
    expect(cost).toBeCloseTo(1000 * (1 / 1_000_000) + 200 * (5 / 1_000_000), 10);
  });

  it("prices a cached call cheaper than the same call uncached", () => {
    // Same total volume, but 2000 of the input tokens came from cache reads instead
    // of being billed as fresh input.
    const uncached = estimateCostUsd({
      totalTokens: 2200,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 200,
    });
    const cached = estimateCostUsd({
      totalTokens: 2200,
      cacheCreationTokens: 0,
      cacheReadTokens: 2000,
      outputTokens: 200,
    });
    expect(cached).toBeLessThan(uncached);
  });
});
