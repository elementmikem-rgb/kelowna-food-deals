import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionRequestParams, verifyExtraction, type VerifiedExtraction } from "./extract";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface BatchSubmissionItem {
  customId: string;
  truncatedPageText: string;
  includeMenuItems: boolean;
}

// Submits one Anthropic Message Batch for every venue queued this region -- the Batch
// API prices every token (input, output, cache read/write) at 50% of the sync-call rate
// in exchange for async delivery (usually minutes, but Anthropic's own SLA is up to 24h),
// which is why this is submit-and-return rather than submit-and-wait: see pollBatch/
// applyBatchResults below for how a later poll picks the results back up.
export async function submitExtractionBatch(items: BatchSubmissionItem[]): Promise<string> {
  const batch = await anthropic.messages.batches.create({
    requests: items.map((item) => ({
      custom_id: item.customId,
      params: buildExtractionRequestParams(item.truncatedPageText, item.includeMenuItems),
    })),
  });
  return batch.id;
}

export type BatchPollStatus =
  | { status: "in_progress" }
  | { status: "ended" }
  | { status: "not_found" };

// Cheap status check -- does not download results. Call applyBatchResults separately
// once this reports "ended".
export async function pollBatchStatus(anthropicBatchId: string): Promise<BatchPollStatus> {
  try {
    const batch = await anthropic.messages.batches.retrieve(anthropicBatchId);
    return { status: batch.processing_status === "ended" ? "ended" : "in_progress" };
  } catch (err) {
    // A 404 here means the batch was deleted or archived out from under us (Anthropic
    // retains results for 29 days, so this should be rare) -- treat it as unrecoverable
    // rather than polling it forever.
    console.warn(`batch ${anthropicBatchId} status check failed: ${err instanceof Error ? err.message : String(err)}`);
    return { status: "not_found" };
  }
}

export interface BatchResultOutcome {
  customId: string;
  outcome:
    | { ok: true; data: VerifiedExtraction; tokensUsed: number; cacheCreationTokens: number; cacheReadTokens: number; outputTokens: number }
    | { ok: false; error: string };
}

// Streams every result line for a finished batch and verifies each one exactly like the
// sync path (verifyExtraction) -- results arrive in no particular order, matched back to
// their venue purely by custom_id, which is why the caller (cron/index.ts) looks up each
// extraction_batch_items row by customId rather than assuming array order.
export async function fetchBatchResults(
  anthropicBatchId: string,
  haystackByCustomId: Map<string, string>
): Promise<BatchResultOutcome[]> {
  const decoder = await anthropic.messages.batches.results(anthropicBatchId);
  const outcomes: BatchResultOutcome[] = [];

  for await (const line of decoder) {
    const { custom_id: customId, result } = line;
    if (result.type !== "succeeded") {
      outcomes.push({ customId, outcome: { ok: false, error: `batch item ${result.type}` } });
      continue;
    }

    const message = result.message;
    const tokensUsed =
      message.usage.input_tokens +
      message.usage.output_tokens +
      (message.usage.cache_creation_input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0);
    const cacheCreationTokens = message.usage.cache_creation_input_tokens ?? 0;
    const cacheReadTokens = message.usage.cache_read_input_tokens ?? 0;
    const outputTokens = message.usage.output_tokens;

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      outcomes.push({ customId, outcome: { ok: false, error: "model did not return a tool_use block" } });
      continue;
    }

    const haystack = haystackByCustomId.get(customId);
    if (haystack === undefined) {
      // Should never happen (every submitted custom_id has a matching item row), but a
      // silent skip here would silently drop a venue's whole night rather than surface it.
      outcomes.push({ customId, outcome: { ok: false, error: "no matching haystack for this custom_id" } });
      continue;
    }

    try {
      const data = verifyExtraction(toolUse.input, haystack);
      outcomes.push({ customId, outcome: { ok: true, data, tokensUsed, cacheCreationTokens, cacheReadTokens, outputTokens } });
    } catch (err) {
      outcomes.push({ customId, outcome: { ok: false, error: err instanceof Error ? err.message : String(err) } });
    }
  }

  return outcomes;
}

// Rough pre-submission cost estimate for the token ceiling: the Batch API's async
// delivery means we can't abort mid-run on real usage the way the old sync loop did (see
// cron/index.ts), so the ceiling check has to happen before submission instead, off an
// estimate. ~4 chars/token is the standard rule-of-thumb for English text (matches
// Anthropic's own docs), plus a fixed allowance for the cached system prompt + tool
// schema + expected output -- deliberately generous (better to under-fill a batch than
// blow through a night's budget on an optimistic estimate).
const CHARS_PER_TOKEN_ESTIMATE = 4;
const FIXED_OVERHEAD_TOKENS_ESTIMATE = 4000;

export function estimateExtractionTokens(truncatedPageText: string): number {
  return Math.ceil(truncatedPageText.length / CHARS_PER_TOKEN_ESTIMATE) + FIXED_OVERHEAD_TOKENS_ESTIMATE;
}
