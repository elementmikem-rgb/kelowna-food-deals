import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { SpecialCategory } from "@/db/schema";

const MODEL = "claude-haiku-4-5-20251001";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractedSpecialSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable(),
  category: z.enum(["happy_hour", "food_special", "wing_night", "other"]),
  confidence: z.number().min(0).max(1),
  extraction_notes: z.string().nullable(),
  evidence_quote: z.string().min(1),
});

export type ExtractedSpecial = Omit<
  z.infer<typeof extractedSpecialSchema>,
  "evidence_quote"
> & {
  category: SpecialCategory;
};

const extractionResultSchema = z.object({
  specials: z.array(extractedSpecialSchema),
});

const SYSTEM_PROMPT = `You extract restaurant/bar food and drink specials from raw scraped page text for a Kelowna, BC specials directory.

Rules, no exceptions:
- Extract ONLY specials that are EXPLICITLY stated with a stated price OR an explicit discount (e.g. "$5 off", "half price wings", "$8 caesars"). A time window on its own (e.g. "Happy Hour 3-6pm") is NOT a qualifying special unless a price or discount is also stated somewhere near it. Do NOT infer, guess, or invent a special that is not clearly written in the text.
- evidence_quote: for every special you report, copy a short VERBATIM substring (exact characters, no paraphrasing) directly from the provided page text that contains the price or discount language proving this special is real. If you cannot find and copy such a literal substring, do not report that special at all — this is not optional.
- If the text contains no qualifying specials, return an empty "specials" array. An empty array is a correct, expected answer for most pages — do not force a result.
- day_of_week: 0=Sunday ... 6=Saturday. Use null if the special runs daily or the day is not stated. If a range like "Mon-Fri" is given, you may only pick ONE day per entry, so instead set day_of_week to null and note the range in extraction_notes, UNLESS the special is explicitly per-day with different details.
- start_time / end_time: 24-hour "HH:MM" format. Use null if not stated.
- price_cents: whole cents (e.g. "$8.50" -> 850). Use null if there's a discount but no absolute price (e.g. "half off wings").
- category: "happy_hour" for drink/general happy hour specials, "wing_night" for wing-specific specials, "food_special" for other food specials, "other" for anything else that qualifies.
- confidence: 0 to 1. Lower confidence (below 0.6) whenever the day or time window is ambiguous, inferred from vague wording, or the source text itself looked stale/uncertain. Use 1.0 only when day, time, and price are all explicitly and unambiguously stated.
- extraction_notes: brief note on any ambiguity, or null if none.
- Never fabricate a price, a day, or a quote. When in doubt, omit the special entirely rather than guess.`;

export interface ExtractionOutcome {
  specials: ExtractedSpecial[];
  tokensUsed: number;
}

const DISCOUNT_SIGNAL = /(\$|%|\boff\b|\bfree\b|\bhalf\b|\bbogo\b|\bbuy one\b|\bdiscount(ed)?\b|\bdeal\b)/i;

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function extractSpecials(pageText: string): Promise<ExtractionOutcome> {
  const truncated = pageText.slice(0, 20000);
  const haystack = collapseWhitespace(truncated);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the raw scraped page text. Extract specials per the rules.\n\n---\n${truncated}\n---`,
      },
    ],
    tools: [
      {
        name: "report_specials",
        description: "Report the list of extracted specials, or an empty list if none qualify.",
        input_schema: {
          type: "object",
          properties: {
            specials: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: ["string", "null"] },
                  price_cents: { type: ["integer", "null"] },
                  day_of_week: { type: ["integer", "null"] },
                  start_time: { type: ["string", "null"] },
                  end_time: { type: ["string", "null"] },
                  category: {
                    type: "string",
                    enum: ["happy_hour", "food_special", "wing_night", "other"],
                  },
                  confidence: { type: "number" },
                  extraction_notes: { type: ["string", "null"] },
                  evidence_quote: {
                    type: "string",
                    description:
                      "Verbatim substring copied from the source text proving the price/discount is real.",
                  },
                },
                required: [
                  "title",
                  "description",
                  "price_cents",
                  "day_of_week",
                  "start_time",
                  "end_time",
                  "category",
                  "confidence",
                  "extraction_notes",
                  "evidence_quote",
                ],
              },
            },
          },
          required: ["specials"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "report_specials" },
  });

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("model did not return a tool_use block");
  }

  const parsed = extractionResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`malformed extraction output: ${parsed.error.message}`);
  }

  const verified: ExtractedSpecial[] = [];
  for (const s of parsed.data.specials) {
    const quote = collapseWhitespace(s.evidence_quote);
    if (!haystack.includes(quote)) {
      console.warn(
        `dropped special "${s.title}": evidence_quote not found verbatim in source text`
      );
      continue;
    }
    if (s.price_cents === null && !DISCOUNT_SIGNAL.test(s.evidence_quote)) {
      console.warn(
        `dropped special "${s.title}": no price and evidence_quote has no discount language ("${s.evidence_quote}")`
      );
      continue;
    }
    const { evidence_quote: _evidence_quote, ...rest } = s;
    verified.push({
      ...rest,
      extraction_notes: rest.extraction_notes
        ? `${rest.extraction_notes} | evidence: "${s.evidence_quote}"`
        : `evidence: "${s.evidence_quote}"`,
    });
  }

  return { specials: verified, tokensUsed };
}
