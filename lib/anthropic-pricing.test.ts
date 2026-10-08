import { describe, expect, it } from "vitest";
import { estimateCostUsd, HAIKU_5_5_CUTOVER_AT } from "./anthropic-pricing";

const BEFORE_CUTOVER = new Date(HAIKU_5_5_CUTOVER_AT.getTime() - 1000);
const AFTER_CUTOVER = new Date(HAIKU_5_5_CUTOVER_AT.getTime() + 1000);

describe("estimateCostUsd", () => {
  it("prices a pre-caching, pre-cutover row as plain input + output at Haiku 4.5 rates", () => {
    // 1000 input + 200 output tokens, nothing cached.
    const cost = estimateCostUsd(
      {
        totalTokens: 1200,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 200,
      },
      BEFORE_CUTOVER
    );
    expect(cost).toBeCloseTo(1000 * (1 / 1_000_000) + 200 * (5 / 1_000_000), 10);
  });

  it("treats null cache fields the same as 0 (rows logged before caching shipped)", () => {
    const cost = estimateCostUsd(
      {
        totalTokens: 1200,
        cacheCreationTokens: null as unknown as number,
        cacheReadTokens: null as unknown as number,
        outputTokens: 200,
      },
      BEFORE_CUTOVER
    );
    expect(cost).toBeCloseTo(1000 * (1 / 1_000_000) + 200 * (5 / 1_000_000), 10);
  });

  it("prices a cached call cheaper than the same call uncached", () => {
    // Same total volume, but 2000 of the input tokens came from cache reads instead
    // of being billed as fresh input.
    const uncached = estimateCostUsd(
      {
        totalTokens: 2200,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 200,
      },
      BEFORE_CUTOVER
    );
    const cached = estimateCostUsd(
      {
        totalTokens: 2200,
        cacheCreationTokens: 0,
        cacheReadTokens: 2000,
        outputTokens: 200,
      },
      BEFORE_CUTOVER
    );
    expect(cached).toBeLessThan(uncached);
  });

  it("prices a post-cutover row at the much cheaper Haiku 5.5 rate", () => {
    const breakdown = {
      totalTokens: 1200,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 200,
    };
    const before = estimateCostUsd(breakdown, BEFORE_CUTOVER);
    const after = estimateCostUsd(breakdown, AFTER_CUTOVER);
    // Haiku 5.5 is a 90% cut -- the same token breakdown should cost roughly a tenth.
    expect(after).toBeCloseTo(before * 0.1, 5);
  });
});
