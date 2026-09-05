import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = "claude-haiku-4-5-20251001";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const baseFields = {
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
};

const specialResultSchema = z.object({
  qualifies: z.boolean(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  is_monthly: z.boolean().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  category: z.enum(["happy_hour", "food_special", "wing_night", "other"]).nullable(),
  ...baseFields,
});

const eventResultSchema = z.object({
  qualifies: z.boolean(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  event_type: z.enum(["live_music", "trivia", "karaoke", "sports_night", "other"]).nullable(),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  specific_date: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  cover_charge_cents: z.number().int().nonnegative().nullable(),
  ...baseFields,
});

export type SpecialReviewResult = z.infer<typeof specialResultSchema>;
export type EventReviewResult = z.infer<typeof eventResultSchema>;

const SYSTEM_PROMPT = `A member of the public submitted an update about a Kelowna, BC venue's food/drink special or live event, via a short text description and/or a photo (e.g. a menu board or sign). Your job is to decide whether this is a clear, specific, real submission worth publishing, and to extract it into structured fields.

Rules, no exceptions:
- qualifies: true only if the submission clearly and specifically describes a real special/event with enough detail to publish (a day/date and, for a special, a price or explicit discount; for an event, a day/date and event type). Vague, joke, spam, or ambiguous submissions must have qualifies: false.
- Never invent details not present in the text or visible in the photo. If the photo doesn't clearly show what's claimed, or the text is too vague, set qualifies: false rather than guess.
- confidence: 0 to 1, reflecting how certain you are this is accurate and ready to publish without human review. Use below 0.7 for anything even slightly ambiguous.
- notes: a brief note explaining your reasoning, especially for anything below full confidence, or null.
- day_of_week: 0=Sunday ... 6=Saturday.
- Prices/covers in whole cents (e.g. "$8.50" -> 850).
- Times in 24-hour "HH:MM" format.
- If a field isn't stated or shown, set it to null rather than guessing.`;

async function callHaiku(
  kind: "special" | "event",
  text: string | null,
  photoBase64: string | null,
  photoMimeType: string | null
) {
  const toolName = kind === "special" ? "report_special_review" : "report_event_review";
  const schemaProps =
    kind === "special"
      ? {
          title: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          price_cents: { type: ["integer", "null"] },
          day_of_week: { type: ["integer", "null"] },
          is_monthly: { type: ["boolean", "null"] },
          start_time: { type: ["string", "null"] },
          end_time: { type: ["string", "null"] },
          category: {
            type: ["string", "null"],
            enum: ["happy_hour", "food_special", "wing_night", "other", null],
          },
        }
      : {
          title: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          event_type: {
            type: ["string", "null"],
            enum: ["live_music", "trivia", "karaoke", "sports_night", "other", null],
          },
          day_of_week: { type: ["integer", "null"] },
          specific_date: { type: ["string", "null"] },
          start_time: { type: ["string", "null"] },
          end_time: { type: ["string", "null"] },
          cover_charge_cents: { type: ["integer", "null"] },
        };

  const content: Anthropic.MessageParam["content"] = [];
  if (photoBase64 && photoMimeType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: photoMimeType as "image/jpeg", data: photoBase64 },
    });
  }
  content.push({
    type: "text",
    text: text
      ? `User-submitted description: "${text}"`
      : "No text description was provided — rely on the photo only.",
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    tools: [
      {
        name: toolName,
        description: `Report whether this ${kind} submission qualifies for publishing, with extracted fields.`,
        input_schema: {
          type: "object",
          properties: {
            qualifies: { type: "boolean" },
            ...schemaProps,
            confidence: { type: "number" },
            notes: { type: ["string", "null"] },
          },
          required: ["qualifies", ...Object.keys(schemaProps), "confidence", "notes"],
        },
      },
    ],
    tool_choice: { type: "tool", name: toolName },
  });

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("model did not return a tool_use block");
  }

  return { input: toolUse.input, tokensUsed };
}

export async function reviewSpecialSubmission(
  text: string | null,
  photoBase64: string | null,
  photoMimeType: string | null
): Promise<{ result: SpecialReviewResult; tokensUsed: number }> {
  const { input, tokensUsed } = await callHaiku("special", text, photoBase64, photoMimeType);
  const parsed = specialResultSchema.safeParse(input);
  if (!parsed.success) throw new Error(`malformed review output: ${parsed.error.message}`);
  return { result: parsed.data, tokensUsed };
}

export async function reviewEventSubmission(
  text: string | null,
  photoBase64: string | null,
  photoMimeType: string | null
): Promise<{ result: EventReviewResult; tokensUsed: number }> {
  const { input, tokensUsed } = await callHaiku("event", text, photoBase64, photoMimeType);
  const parsed = eventResultSchema.safeParse(input);
  if (!parsed.success) throw new Error(`malformed review output: ${parsed.error.message}`);
  return { result: parsed.data, tokensUsed };
}

export const AUTO_APPROVE_CONFIDENCE = 0.85;
