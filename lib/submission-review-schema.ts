import { z } from "zod";

// Split out from lib/submission-review.ts: that file does a module-scope
// `new Anthropic(...)`, so anything importing from it -- even just a type or
// schema -- drags the Anthropic SDK into whatever bundle imports it. This
// file has zero side effects and is safe for a "use client" component to
// import (see components/AdminSubmissionRow.tsx).

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
  evidence_quote: z.string().min(1),
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
  evidence_quote: z.string().min(1),
});

const extractedMenuItemSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
  evidence_quote: z.string().min(1),
});

export const reviewResultSchema = z.object({
  specials: z.array(extractedSpecialSchema).default([]),
  events: z.array(extractedEventSchema).default([]),
  menu_items: z.array(extractedMenuItemSchema).default([]),
});

export type ExtractedSubmissionSpecial = z.infer<typeof extractedSpecialSchema>;
export type ExtractedSubmissionEvent = z.infer<typeof extractedEventSchema>;
export type ExtractedSubmissionMenuItem = z.infer<typeof extractedMenuItemSchema>;
export type SubmissionReviewResult = z.infer<typeof reviewResultSchema>;
