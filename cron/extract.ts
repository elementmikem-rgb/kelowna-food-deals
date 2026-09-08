import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { SpecialCategory, EventType } from "@/db/schema";
import { pacificTodayISODate } from "@/lib/time";

const MODEL = "claude-haiku-4-5-20251001";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractedSpecialSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  is_monthly: z.boolean(),
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
  // min 15, not 1: a single character (or a one-word "wings") is trivially
  // present in almost any page text, so a too-short quote proves nothing.
  evidence_quote: z.string().min(15),
});

const extractedMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  extraction_notes: z.string().nullable(),
  // A named item + its own price ("Fish Tacos $16") is already a short quote,
  // so this floor is lower than specials'/events' -- 15 chars would reject
  // plenty of real, short menu lines.
  evidence_quote: z.string().min(6),
});

const extractedEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  event_type: z.enum(["live_music", "trivia", "karaoke", "sports_night", "other"]),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  specific_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable(),
  cover_charge_cents: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
  extraction_notes: z.string().nullable(),
  evidence_quote: z.string().min(15),
});

export type ExtractedSpecial = Omit<
  z.infer<typeof extractedSpecialSchema>,
  "evidence_quote"
> & {
  category: SpecialCategory;
};

export type ExtractedEvent = Omit<z.infer<typeof extractedEventSchema>, "evidence_quote"> & {
  event_type: EventType;
};

export type ExtractedMenuItem = Omit<z.infer<typeof extractedMenuItemSchema>, "evidence_quote">;

const extractionResultSchema = z.object({
  specials: z.array(z.unknown()).default([]),
  events: z.array(z.unknown()).default([]),
  menu_items: z.array(z.unknown()).default([]),
});

const SYSTEM_PROMPT = `You extract three kinds of listings from raw scraped page text for a Kelowna, BC venue: food/drink SPECIALS, scheduled EVENTS (live music, trivia, karaoke, sports nights), and regular MENU ITEMS. The text may be several of the venue's own pages concatenated together (each preceded by a "=== PAGE: <url> ===" marker) -- treat it as one combined source. A page may contain any combination of these, or none.

SPECIALS rules, no exceptions:
- Extract ONLY specials that are EXPLICITLY stated with a stated price OR an explicit discount (e.g. "$5 off", "half price wings", "$8 caesars"). A time window on its own (e.g. "Happy Hour 3-6pm") is NOT a qualifying special unless a price or discount is also stated somewhere near it. Do NOT infer, guess, or invent a special that is not clearly written in the text.
- A stated price is NOT by itself proof of a special. A venue's regular, every-day, full a-la-carte menu (breakfast items, burgers, entrees, sides) lists a price for every item -- that price is not a deal. Only extract a priced item as a special when the surrounding text frames it as a promotion: it appears under a heading like "Happy Hour", "Daily Specials", "Promotions", "Deals", or the item's own wording marks it as time-limited or discounted (e.g. "3-6pm only", "$5 off", "today's feature"). A "Cheese Burger Deluxe with Fries $18" sitting on a normal menu page with no such framing is NOT a special, even though it has a clear price -- skip it.
- A Happy Hour (or similar) section almost always lists SEVERAL separately priced items (e.g. "6\" Hot Honey Pizza $10", "Draft Beer $1 off", "House Wine $6.75"). Extract EACH one as its own separate special with its own exact price and its own short, specific evidence_quote — never summarize multiple priced items into one umbrella entry like "Happy Hour" or "Happy Hour Drinks", since that produces a vague title with no single price and a quote that won't match verbatim (both are why such entries get rejected). One special per priced line item, always.
- day_of_week: 0=Sunday ... 6=Saturday. Use null ONLY if the special explicitly runs every day of the week (e.g. "daily happy hour", "7 days a week") or no day/range is stated at all. If an explicit range is given (e.g. "Mon-Fri", "weekdays", "Tue-Thu"), do NOT collapse it to null — that would falsely show it on days it doesn't run. Instead, output ONE separate entry per day in that range, each with identical price/description/times/evidence_quote but its own day_of_week value (e.g. "Mon-Fri" -> 5 entries for day_of_week 1,2,3,4,5, all five copying the exact same evidence_quote — do NOT invent a different per-day quote for each copy, since the source text only states the range once). "Weekends" -> entries for 0 and 6.
- is_monthly: true ONLY when the text explicitly frames the special as a month-long promotion tied to a specific month (e.g. "September Special", "Feature of the Month", "all month long"). When true, set day_of_week/start_time/end_time to null.
- start_time / end_time: 24-hour "HH:MM" format. Use null if not stated. Always null when is_monthly is true.
- price_cents: whole cents (e.g. "$8.50" -> 850). Use null if there's a discount but no absolute price (e.g. "half off wings").
- category: "happy_hour" for drink/general happy hour specials, "wing_night" for wing-specific specials, "food_special" for other food specials, "other" for anything else that qualifies.

EVENTS rules, no exceptions:
- Extract ONLY events with an EXPLICITLY stated day/date AND a stated event type (e.g. "Live Music every Friday 8pm", "Trivia Night Tuesdays"). A vague mention like "check out our events page" or "live entertainment" with no day/time is NOT a qualifying event.
- title: the act/performer name if given, otherwise a short descriptive name (e.g. "Trivia Night").
- day_of_week and specific_date are MUTUALLY EXCLUSIVE — exactly one of them must be non-null, never both and never neither. day_of_week means "this happens every week on this weekday" (e.g. "Trivia every Tuesday"); specific_date means "this happens once, on this exact calendar date" (e.g. a named performer's one-night show, even if that date happens to fall on a Saturday). A one-off event with a named date must have day_of_week set to null — do NOT also fill in day_of_week just because the date lands on that weekday, or a single show will incorrectly appear to repeat every week.
- day_of_week: for a RECURRING weekly event (e.g. "every Friday"). Use null for anything tied to one specific date instead.
- specific_date: "YYYY-MM-DD" for a ONE-OFF event tied to an exact calendar date. Use null for recurring weekly events. Never guess a date — only use this when an explicit date is stated in the text. If the text gives a month and day but no year (e.g. "Thursday September 10"), resolve the year yourself using the current date given below: pick the soonest occurrence of that month/day that is on or after today (rolling into next year only if that month/day has already passed this year). Never default to the current year blindly, and never guess a year the text doesn't otherwise support.
- event_type: "live_music" for bands/DJs/performers, "trivia" for trivia/quiz nights, "karaoke", "sports_night" for game-watching nights, "other" for anything else that qualifies.
- cover_charge_cents: whole cents if a cover/ticket price is explicitly stated, otherwise null (null does not disqualify the event — most local live music nights are free).

MENU ITEMS rules, no exceptions:
- Extract regular a-la-carte menu items: named dish/drink + its stated price. Unlike specials, a menu item does NOT need promotional framing — the venue's everyday burger, pizza, or cocktail listing counts, as long as it has a real name and a real price.
- Do NOT extract items from a "Happy Hour"/"Specials"/"Promotions" section here — those belong in the specials array instead (extract them there, not as menu items, so the same line never appears in both arrays).
- Do NOT extract items with no stated price (e.g. "Ask your server", "MP"/market price, or a category heading with no price of its own).
- If the source text is a very long full menu, prioritize the most prominent/signature items rather than exhaustively transcribing every single line — extract at most 40 items per page, favoring named dishes over minor variations (e.g. skip listing every burger topping add-on as its own item).
- description: a short one-line summary of what's included, if the text gives one (e.g. ingredients). Null if none stated.

Shared rules for ALL THREE (specials, events, menu items):
- evidence_quote: for every item you report, copy a short VERBATIM substring (exact characters, no paraphrasing) directly from the provided page text proving this item is real (the price/discount language for a special; the day/date + event-type language for an event; the name + price for a menu item). If you cannot find and copy such a literal substring, do not report that item at all — this is not optional.
- If the text contains no qualifying specials, events, and/or menu items, return empty arrays for those. Empty arrays are correct, expected answers for most pages — do not force a result.
- confidence: 0 to 1. Lower confidence (below 0.6) whenever the day/date or time window is ambiguous, inferred from vague wording, or the source text itself looked stale/uncertain. Use 1.0 only when everything relevant is explicitly and unambiguously stated.
- extraction_notes: brief note on any ambiguity, or null if none.
- Never fabricate a price, a day, a date, or a quote. When in doubt, omit the item entirely rather than guess.`;

export interface ExtractionOutcome {
  specials: ExtractedSpecial[];
  events: ExtractedEvent[];
  menuItems: ExtractedMenuItem[];
  tokensUsed: number;
}

// ½ is the Unicode fraction character, not the spelled-out word "half" --
// source pages routinely use it ("½ Price Bottles of Wine") and it matched
// nothing here, silently dropping otherwise-valid discount specials.
const DISCOUNT_SIGNAL = /(\$|%|½|\boff\b|\bfree\b|\bhalf\b|\bbogo\b|\bbuy one\b|\bdiscount(ed)?\b|\bdeal\b)/i;

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// A quoted price only proves anything if the quote actually contains the price
// the model claims. Without this, a fabricated price_cents can ride along on a
// real-but-unrelated substring ("wings") and publish as fact.
// `quote` is already whitespace-collapsed and lowercased.
function evidenceContainsPrice(quote: string, priceCents: number): boolean {
  const whole = Math.floor(priceCents / 100);
  const cents = priceCents % 100;
  const forms = [`${whole}\\.${String(cents).padStart(2, "0")}`]; // 1250 -> "12.50"
  if (cents === 0) forms.push(`${whole}`); // 500 -> "5" (covers "$5")
  if (cents % 10 === 0) forms.push(`${whole}\\.${cents / 10}`); // 1250 -> "12.5"
  // Boundaries on both sides so "$5" isn't satisfied by "$50" or "$15.00".
  return new RegExp(`(?<![\\d.])\\$?\\s?(?:${forms.join("|")})(?![\\d])`).test(quote);
}

// Raised from 20000 to accommodate several of a venue's pages concatenated
// together (see index.ts's multi-page fetch) -- Haiku's context window
// comfortably fits this, and the per-page truncation risk this guards
// against (see the warning below) matters more now that one truncated
// batch can silently drop a whole extra page, not just the tail of one.
const MAX_PAGE_CHARS = 60000;

export async function extractVenueContent(pageText: string): Promise<ExtractionOutcome> {
  if (pageText.length > MAX_PAGE_CHARS) {
    // The caller archives every active special/event before inserting this
    // extraction's results, so anything past the cutoff silently disappears
    // from the live site as if the venue had cancelled it.
    console.warn(
      `page text truncated at ${MAX_PAGE_CHARS} chars: ${pageText.length - MAX_PAGE_CHARS} character(s) dropped — specials/events past the cutoff will be archived as if removed`
    );
  }
  const truncated = pageText.slice(0, MAX_PAGE_CHARS);
  const haystack = collapseWhitespace(truncated);

  const response = await anthropic.messages.create({
    model: MODEL,
    // Raised from 8192: menu_items can add dozens of extra items to the
    // output on a venue with a big menu page, on top of specials/events.
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Today's date is ${pacificTodayISODate()} (Kelowna, BC). Here is the raw scraped page text (possibly several pages concatenated, each marked with "=== PAGE: <url> ==="). Extract specials, events, and menu items per the rules.\n\n---\n${truncated}\n---`,
      },
    ],
    tools: [
      {
        name: "report_venue_content",
        description:
          "Report the extracted specials, events, and menu items, or empty arrays for whichever kind doesn't qualify.",
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
                  "is_monthly",
                  "start_time",
                  "end_time",
                  "category",
                  "confidence",
                  "extraction_notes",
                  "evidence_quote",
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
                  confidence: { type: "number" },
                  extraction_notes: { type: ["string", "null"] },
                  evidence_quote: {
                    type: "string",
                    description:
                      "Verbatim substring copied from the source text proving the day/date + event-type is real.",
                  },
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
                  "extraction_notes",
                  "evidence_quote",
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
                  price_cents: { type: "integer" },
                  confidence: { type: "number" },
                  extraction_notes: { type: ["string", "null"] },
                  evidence_quote: {
                    type: "string",
                    description: "Verbatim substring copied from the source text proving the name + price is real.",
                  },
                },
                required: [
                  "name",
                  "description",
                  "price_cents",
                  "confidence",
                  "extraction_notes",
                  "evidence_quote",
                ],
              },
            },
          },
          required: ["specials", "events", "menu_items"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "report_venue_content" },
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

  const verifiedSpecials: ExtractedSpecial[] = [];
  for (const raw of parsed.data.specials) {
    const specialParsed = extractedSpecialSchema.safeParse(raw);
    if (!specialParsed.success) {
      console.warn(`dropped malformed special: ${specialParsed.error.message}`);
      continue;
    }
    const s = specialParsed.data;
    const quote = collapseWhitespace(s.evidence_quote);
    if (!haystack.includes(quote)) {
      console.warn(
        `dropped special "${s.title}": evidence_quote not found verbatim in source text`
      );
      continue;
    }
    if (s.price_cents === null || s.price_cents === 0) {
      if (!DISCOUNT_SIGNAL.test(s.evidence_quote)) {
        console.warn(
          `dropped special "${s.title}": no price and evidence_quote has no discount language ("${s.evidence_quote}")`
        );
        continue;
      }
    } else if (!evidenceContainsPrice(quote, s.price_cents)) {
      console.warn(
        `dropped special "${s.title}": claimed price ${s.price_cents} cents does not appear in evidence_quote ("${s.evidence_quote}")`
      );
      continue;
    }
    const { evidence_quote: _evidence_quote, ...rest } = s;
    verifiedSpecials.push({
      ...rest,
      extraction_notes: rest.extraction_notes
        ? `${rest.extraction_notes} | evidence: "${s.evidence_quote}"`
        : `evidence: "${s.evidence_quote}"`,
    });
  }

  const verifiedEvents: ExtractedEvent[] = [];
  for (const raw of parsed.data.events) {
    const eventParsed = extractedEventSchema.safeParse(raw);
    if (!eventParsed.success) {
      console.warn(`dropped malformed event: ${eventParsed.error.message}`);
      continue;
    }
    const e = eventParsed.data;
    const quote = collapseWhitespace(e.evidence_quote);
    if (!haystack.includes(quote)) {
      console.warn(`dropped event "${e.title}": evidence_quote not found verbatim in source text`);
      continue;
    }
    if (e.day_of_week === null && e.specific_date === null) {
      console.warn(`dropped event "${e.title}": neither day_of_week nor specific_date set`);
      continue;
    }
    const { evidence_quote: _evidence_quote, ...rest } = e;
    verifiedEvents.push({
      ...rest,
      extraction_notes: rest.extraction_notes
        ? `${rest.extraction_notes} | evidence: "${e.evidence_quote}"`
        : `evidence: "${e.evidence_quote}"`,
    });
  }

  const verifiedMenuItems: ExtractedMenuItem[] = [];
  for (const raw of parsed.data.menu_items) {
    const itemParsed = extractedMenuItemSchema.safeParse(raw);
    if (!itemParsed.success) {
      console.warn(`dropped malformed menu item: ${itemParsed.error.message}`);
      continue;
    }
    const m = itemParsed.data;
    const quote = collapseWhitespace(m.evidence_quote);
    if (!haystack.includes(quote)) {
      console.warn(`dropped menu item "${m.name}": evidence_quote not found verbatim in source text`);
      continue;
    }
    // Unlike specials, a menu item always needs a real matching price -- no
    // "discount language instead of a price" fallback, since there's no
    // discount concept for a regular menu listing.
    if (!evidenceContainsPrice(quote, m.price_cents)) {
      console.warn(
        `dropped menu item "${m.name}": claimed price ${m.price_cents} cents does not appear in evidence_quote ("${m.evidence_quote}")`
      );
      continue;
    }
    const { evidence_quote: _evidence_quote, ...rest } = m;
    verifiedMenuItems.push({
      ...rest,
      extraction_notes: rest.extraction_notes
        ? `${rest.extraction_notes} | evidence: "${m.evidence_quote}"`
        : `evidence: "${m.evidence_quote}"`,
    });
  }

  return {
    specials: verifiedSpecials,
    events: verifiedEvents,
    menuItems: verifiedMenuItems,
    tokensUsed,
  };
}
