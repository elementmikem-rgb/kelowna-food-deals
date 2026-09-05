import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = "claude-haiku-4-5-20251001";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractedSpecialSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  is_monthly: z.boolean(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  category: z.enum(["happy_hour", "food_special", "wing_night", "other"]),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

const extractedEventSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  event_type: z.enum(["live_music", "trivia", "karaoke", "sports_night", "other"]),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  specific_date: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  cover_charge_cents: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

const extractedMenuItemSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

const reviewResultSchema = z.object({
  specials: z.array(extractedSpecialSchema).default([]),
  events: z.array(extractedEventSchema).default([]),
  menu_items: z.array(extractedMenuItemSchema).default([]),
});

export type ExtractedSubmissionSpecial = z.infer<typeof extractedSpecialSchema>;
export type ExtractedSubmissionEvent = z.infer<typeof extractedEventSchema>;
export type ExtractedSubmissionMenuItem = z.infer<typeof extractedMenuItemSchema>;
export type SubmissionReviewResult = z.infer<typeof reviewResultSchema>;

const SYSTEM_PROMPT = `A member of the public submitted a photo and/or text description of a Kelowna, BC venue — a menu board, a chalkboard, a flyer, a bulletin board, or just a written description. It may show ONE thing or MANY things at once (e.g. a whole weekly specials board, a full menu, several event flyers pinned together). Find and extract EVERY distinct qualifying item you can see or that's described — do not stop at the first one.

Sort each item into exactly one of three buckets:

SPECIALS (food/drink deals) — qualifies only if it has an explicit price OR explicit discount language (e.g. "$5 off", "half price wings", "$8 caesars"). A bare "Happy Hour 3-6pm" with no price/discount does not qualify as a special.
- day_of_week: 0=Sunday...6=Saturday, or null if daily/unstated/unclear.
- is_monthly: true only for an explicit month-long promotion.
- category: "happy_hour" | "wing_night" | "food_special" | "other"

EVENTS (live music, trivia, karaoke, sports nights, etc) — qualifies only if it has an explicit day/date AND a stated event type. A vague "check our events page" does not qualify.
- day_of_week: for a RECURRING weekly event, else null.
- specific_date: "YYYY-MM-DD" for a ONE-OFF event on an exact date, else null. Never guess a date.
- Must have day_of_week OR specific_date set to qualify.
- event_type: "live_music" | "trivia" | "karaoke" | "sports_night" | "other"

MENU ITEMS (regular, non-discounted menu entries — this is NOT a deal, just informational) — qualifies if it has a clear name AND at least a price or a description visible/stated. Use this bucket for ordinary menu items that aren't framed as a special/discount (e.g. a burger with its regular price, a cocktail description). Skip items that are just illegible fragments.

Shared rules, no exceptions:
- Never invent details not clearly visible in the photo or stated in the text. If something is illegible, ambiguous, or ambiguous which bucket it belongs to, leave it out entirely rather than guess.
- confidence: 0 to 1 per item, reflecting how certain you are this is accurate and ready to publish without human review. Use below 0.85 for anything even slightly ambiguous, illegible, or inferred.
- notes: brief reasoning for anything below full confidence, or null.
- Prices/covers in whole cents (e.g. "$8.50" -> 850).
- Times in 24-hour "HH:MM" format.
- If nothing qualifies in a bucket, return an empty array for it — that's a correct, expected result. Don't force items into a bucket to avoid an empty array.`;

export async function reviewSubmission(
  text: string | null,
  photoBase64: string | null,
  photoMimeType: string | null
): Promise<{ result: SubmissionReviewResult; tokensUsed: number }> {
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

  const itemBase = {
    confidence: { type: "number" },
    notes: { type: ["string", "null"] },
  };

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    tools: [
      {
        name: "report_submission_review",
        description: "Report every qualifying special, event, and menu item found.",
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
                  is_monthly: { type: "boolean" },
                  start_time: { type: ["string", "null"] },
                  end_time: { type: ["string", "null"] },
                  category: {
                    type: "string",
                    enum: ["happy_hour", "food_special", "wing_night", "other"],
                  },
                  ...itemBase,
                },
                required: [
                  "title",
                  "description",
                  "price_cents",
                  "day_of_week",
                  "is_monthly",
                  "start_time",
                  "end_time",
                  "category",
                  "confidence",
                  "notes",
                ],
              },
            },
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: ["string", "null"] },
                  event_type: {
                    type: "string",
                    enum: ["live_music", "trivia", "karaoke", "sports_night", "other"],
                  },
                  day_of_week: { type: ["integer", "null"] },
                  specific_date: { type: ["string", "null"] },
                  start_time: { type: ["string", "null"] },
                  end_time: { type: ["string", "null"] },
                  cover_charge_cents: { type: ["integer", "null"] },
                  ...itemBase,
                },
                required: [
                  "title",
                  "description",
                  "event_type",
                  "day_of_week",
                  "specific_date",
                  "start_time",
                  "end_time",
                  "cover_charge_cents",
                  "confidence",
                  "notes",
                ],
              },
            },
            menu_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: ["string", "null"] },
                  price_cents: { type: ["integer", "null"] },
                  ...itemBase,
                },
                required: ["name", "description", "price_cents", "confidence", "notes"],
              },
            },
          },
          required: ["specials", "events", "menu_items"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "report_submission_review" },
  });

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("model did not return a tool_use block");
  }

  const parsed = reviewResultSchema.safeParse(toolUse.input);
  if (!parsed.success) throw new Error(`malformed review output: ${parsed.error.message}`);

  return { result: parsed.data, tokensUsed };
}

export const AUTO_APPROVE_CONFIDENCE = 0.85;
