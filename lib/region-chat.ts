import Anthropic from "@anthropic-ai/sdk";
import { getAllSpecialsWithVenue } from "./data";
import { getRecurringEvents, getUpcomingOneOffEvents } from "./events-data";
import { todayDowInRegion, isStale, regionTodayISODate } from "./time";
import { dowFullNameLocalized } from "./i18n";
import { formatEventDate } from "./format";
import { isPromotionActive } from "./promotion";
import { getChatTermSponsorsForRegion } from "./sponsored-data";

const MODEL = "claude-haiku-5-5";
const MAX_QUESTION_LENGTH = 200;
// Raised from 130 to 1024 on the Haiku 5.5 switch -- 5.5 does extended thinking by
// default (no opt-in needed), and 130 was consumed entirely by thinking tokens before any
// answer text could be produced, confirmed by a real test returning a lone "thinking"
// block with no text block at all. 1024 leaves real headroom for both; the answer itself
// still stays short since the system prompt instructs a brief reply.
const MAX_ANSWER_TOKENS = 1024;
// A large region (Kelowna: 89 active venues) can have far more today-matching items than
// a short answer ever needs to mention -- capping keeps both the answer focused and the
// per-query token cost bounded (a live test against Kelowna's full uncapped list ran
// ~14,300 tokens/query, ~3-4x the size planned around). Capped separately per type, not
// as one combined slice -- Kelowna alone has 30+ specials some days, and a single shared
// cap discarded every event before any made it into context, which made a legitimate
// "what's happening tonight" question look unanswerable and get wrongly declined.
const MAX_SPECIALS_ITEMS = 60;
const MAX_SPECIALS_PER_VENUE = 3;
// Recurring events (trivia nights, jam nights, etc.) run on a known weekly schedule --
// unlike specials, which are only verified for today, so "any trivia on Tuesday" is a
// perfectly answerable question. Capped separately from one-off events below, not as one
// shared slice -- Kelowna alone has 40 recurring events, which filled a single shared cap
// entirely and silently excluded every one-off (specifically-dated) event, including real
// ones a visitor asked about directly by venue and date. Same crowding shape as the
// specials-per-venue bug above, different list.
const MAX_RECURRING_EVENTS_ITEMS = 40;
// One-off (specifically-dated) events -- concerts, fundraisers, etc.
const MAX_ONE_OFF_EVENTS_ITEMS = 25;
// One-off (specifically-dated) events -- concerts, fundraisers, etc. -- used to be fetched
// for today only, which silently hid a real event from an answer to something as ordinary
// as "does X have anything next Saturday". A few weeks out covers realistic near-term
// planning questions without pulling in the whole season.
const ONE_OFF_EVENTS_DAYS_AHEAD = 21;
// A follow-up like "in West Kelowna" only makes sense with the prior turns attached, but
// unlike the cached today's-context block, conversation history is NOT cacheable (it's
// different per visitor and grows every turn) -- every turn re-pays full input price on
// all of it. Capping to the last few turns keeps a long back-and-forth from quietly
// turning into an expensive one; older turns just fall out of the window.
const MAX_HISTORY_TURNS = 4;

// Same reasoning as lib/submission-review.ts's client -- reachable from an
// unauthenticated public route, fail fast rather than let the SDK's default
// 10-minute timeout / 2 retries hold a connection or triple the bill.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 45_000,
  maxRetries: 1,
});

export class QuestionTooLongError extends Error {}

export function validateQuestion(question: string): string {
  const trimmed = question.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_QUESTION_LENGTH) {
    throw new QuestionTooLongError(`question must be 1-${MAX_QUESTION_LENGTH} characters`);
  }
  return trimmed;
}

// Identical rule to lib/seo.ts's buildSpecialsJsonLd -- a special/event "running today"
// means dayOfWeek is null (daily), matches today's weekday, or is an explicit monthly
// promotion. The chat must never claim something the page itself doesn't show, so this
// stays in lockstep with the same filter SpecialsBoard.tsx applies client-side.
export function runningToday<T extends { dayOfWeek: number | null; isMonthly?: boolean; lastVerifiedAt: Date }>(
  items: T[],
  today: number
): T[] {
  return items.filter(
    (item) =>
      (item.dayOfWeek === null || item.dayOfWeek === today || item.isMonthly === true) &&
      !isStale(item.lastVerifiedAt)
  );
}

export function formatPrice(cents: number | null): string {
  return cents === null ? "" : `, $${(cents / 100).toFixed(2)}`;
}

// A paid-Promoted item shouldn't be at the mercy of arbitrary DB order the way the
// specials-per-venue and recurring-vs-one-off-events crowding bugs were -- someone paid
// for visibility, so it has to actually survive whichever cap applies to its list. Stably
// moves Promoted items to the front so a later .slice(0, cap) always keeps them.
export function sortFeaturedFirst<T>(items: T[], isFeatured: (item: T) => boolean): T[] {
  const featured: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    (isFeatured(item) ? featured : rest).push(item);
  }
  return [...featured, ...rest];
}

// Builds the compact, today-only context block a question is answered against. Only
// today-matching rows go in -- not the region's full weekly list -- which is what keeps
// this cheap for every region except the very largest.
export async function buildTodayContext(regionId: number, timezone: string): Promise<string> {
  const today = todayDowInRegion(timezone);

  // Deliberately chatBoostedUntil, not boostedUntil -- "Promoted in chat" is a separate,
  // independently-purchasable add-on from the public board's "Featured" placement. A
  // venue can have either, both, or neither; this check must never read the other field.
  const isFeatured = (item: { chatBoostedUntil: Date | null }) => isPromotionActive(item.chatBoostedUntil);

  const specials = sortFeaturedFirst(runningToday(await getAllSpecialsWithVenue(regionId), today), isFeatured);
  // Not filtered to today -- a recurring event's whole weekly schedule is known in
  // advance (it's not a freshness question the way specials are), so a visitor can
  // reasonably ask about any day, not just tonight. Each line below names its day.
  const recurringEvents = sortFeaturedFirst(
    (await getRecurringEvents(regionId)).filter((e) => !isStale(e.lastVerifiedAt)),
    isFeatured
  );
  const oneOffEvents = sortFeaturedFirst(
    (await getUpcomingOneOffEvents(regionId, timezone, ONE_OFF_EVENTS_DAYS_AHEAD)).filter(
      (e) => !isStale(e.lastVerifiedAt)
    ),
    isFeatured
  );

  // getAllSpecialsWithVenue has no ORDER BY, so a plain top-N slice is really a
  // top-N-by-whatever-Postgres-felt-like slice -- in a region with 400+ specials
  // across 48 venues, that let a handful of venues with many items each crowd out
  // every other venue entirely, so "cheapest beer" answers came from whichever
  // venues happened to survive the slice instead of the actual cheapest one. Cap
  // per venue first so the slice spans as many venues as the budget allows.
  const perVenueCount = new Map<number, number>();
  const diverseSpecials: typeof specials = [];
  for (const s of specials) {
    const seen = perVenueCount.get(s.venueId) ?? 0;
    if (seen >= MAX_SPECIALS_PER_VENUE) continue;
    perVenueCount.set(s.venueId, seen + 1);
    diverseSpecials.push(s);
  }

  const lines: string[] = [];
  for (const s of diverseSpecials.slice(0, MAX_SPECIALS_ITEMS)) {
    const featured = isFeatured(s) ? " (Promoted)" : "";
    lines.push(`${s.venueName}: ${s.title}${featured}${formatPrice(s.priceCents)} (${s.category})`);
  }
  for (const e of recurringEvents.slice(0, MAX_RECURRING_EVENTS_ITEMS)) {
    const time = e.startTime ? ` at ${e.startTime}` : "";
    const cover = formatPrice(e.coverChargeCents ?? null);
    const day = e.dayOfWeek === null ? "" : ` (${dowFullNameLocalized(e.dayOfWeek, "en")}s)`;
    const featured = isFeatured(e) ? " (Promoted)" : "";
    lines.push(`${e.venueName}: ${e.title}${day}${featured}${time}${cover} (${e.eventType})`);
  }
  for (const e of oneOffEvents.slice(0, MAX_ONE_OFF_EVENTS_ITEMS)) {
    const time = e.startTime ? ` at ${e.startTime}` : "";
    const cover = formatPrice(e.coverChargeCents ?? null);
    const date = e.specificDate ? ` (${formatEventDate(e.specificDate)})` : "";
    const featured = isFeatured(e) ? " (Promoted)" : "";
    lines.push(`${e.venueName}: ${e.title}${date}${featured}${time}${cover} (${e.eventType})`);
  }

  // Anchors relative-date questions ("next Saturday", "this Friday") to a real calendar
  // date -- without it, the model has no way to know which date "next Saturday" actually
  // is, since the region's server timezone isn't necessarily the model's assumed "now".
  const todayISO = regionTodayISODate(timezone);
  const todayLine = `Today is ${dowFullNameLocalized(today, "en")}, ${todayISO}.`;
  const body = lines.length > 0 ? lines.join("\n") : "Nothing is listed for today in this region yet.";

  // A term sponsorship isn't tied to one specific special/event line -- a venue owns a
  // whole term ("beer", "trivia") in this region, so it's surfaced as a standing
  // instruction rather than a per-item tag. See buildSystemPrompt's Promoted paragraph.
  const termSponsors = await getChatTermSponsorsForRegion(regionId);
  const termBlock =
    termSponsors.length > 0
      ? `\n\nPaid term promotions in this region:\n${termSponsors
          .map((t) => `${t.venueName} is promoted for "${t.term}"`)
          .join("\n")}`
      : "";

  return `${todayLine}\n${body}${termBlock}`;
}

function buildSystemPrompt(brandName: string, language: string): string {
  const languageLine =
    language === "fr"
      ? "Answer in French, since this region's audience is francophone."
      : "Answer in English.";
  return `You are a small, tightly-scoped assistant embedded on ${brandName}, a site listing today's food/drink specials and events for this area.

You will be given today's actual date, then a list of this region's actual specials and events. Specials with no date tag only run today; never suggest them for another day. Recurring events are marked with the day(s) they run on (e.g. "(Tuesdays)") -- a known weekly schedule, so it's fine to answer about any day of the week for those. One-off events are marked with their actual date (e.g. "(Sat, Sep 26)") -- use today's date to work out things like "next Saturday" or "this Friday" against those. Answer the visitor's question using ONLY this list -- never invent a venue, price, date, or detail that isn't in it. Be helpful, not just accurate: if there's no exact match for what they asked, recommend the closest relevant venue and deal from the list instead of saying you don't have it -- always try to name one specific place worth going. Only say the list doesn't cover it if genuinely nothing in the list is close (e.g. they asked about a category, like live music or cheap food, that has zero matches).

Some items are marked "(Promoted)", and separately you may be shown a "Paid term promotions" list naming a venue against a word like "beer" or "trivia" -- both mean the same thing: a venue paid to be mentioned in this chat specifically (a separate thing from any "Featured" badge on the site itself). Never let either kind of Promoted signal change which answer is actually best: always give the genuinely best/cheapest/closest match first, exactly as you would without any Promoted items or term promotions existing. Then check: is there a Promoted item OR a term-promoted venue that's also a real match for the same category/question (same kind of deal, e.g. also a beer deal for a beer question, or the promoted term itself is what they asked about)? If yes, you MUST add one short, clearly-labeled mention of it right after the real answer, even if it means slightly less detail elsewhere -- this is a paid placement that should show up whenever it's actually relevant, not just when convenient. Example: "Cutwater has the cheapest beer at $3.88, and Kettle River (Promoted) has $6 lager happy hour too." If nothing Promoted matches the question's category at all, don't force one in.

You may be shown a few previous turns of this same conversation before the visitor's newest message. Use them to resolve follow-ups -- e.g. if they asked about cheap beer and then just say "in West Kelowna", answer as "cheap beer in West Kelowna". Every answer, including follow-ups, still follows every rule in this prompt.

You must NOT answer anything unrelated to today's specials/events in this region -- no general chit-chat, no other cities, no weather, no unrelated advice, no requests to write code or content, no roleplay. For anything off-topic, decline in ONE short sentence -- do not add a follow-up question or offer alternatives.

STRICT FORMAT: plain prose only, like a text message from a friend -- never markdown, never bullet points, never headers, never bold/asterisks, never numbered lists. Mention at most 2-3 specific venues by name. Maximum 2 sentences, total. If you feel the urge to write more than that, you're doing it wrong -- pick the single best answer and stop.

Never hedge or apologize -- no "I can't confirm", "unfortunately", "I'm not sure", "specifically". State what's in the list plainly and confidently. If a detail (like exact hours) isn't in the list, just don't mention it -- don't call attention to what's missing.

${languageLine}`;
}

export interface RegionChatAnswer {
  answer: string;
  tokensUsed: number;
}

export interface ChatTurn {
  question: string;
  answer: string;
}

export async function answerRegionQuestion(
  regionId: number,
  timezone: string,
  brandName: string,
  language: string,
  question: string,
  history: ChatTurn[] = []
): Promise<RegionChatAnswer> {
  const trimmed = validateQuestion(question);

  const context = await buildTodayContext(regionId, timezone);

  // Unlike the today's-context block above, history is different per visitor and grows
  // every turn, so it can't be cached -- only the last few turns are sent, both to bound
  // cost and because a visitor's actual follow-ups never need to reach further back than
  // that. See MAX_HISTORY_TURNS.
  const recentHistory = history.slice(-MAX_HISTORY_TURNS);
  const historyMessages: Anthropic.MessageParam[] = recentHistory.flatMap((turn) => [
    { role: "user" as const, content: turn.question },
    { role: "assistant" as const, content: turn.answer },
  ]);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    // Disabled -- a short, latency-sensitive visitor-facing chat answer has nothing to
    // reason about, and Haiku 5.5 does adaptive thinking by default otherwise (this was
    // the root cause of MAX_ANSWER_TOKENS being too small above: thinking alone consumed
    // the old 130-token budget before any answer text could be produced).
    thinking: { type: "disabled" as const },
    system: [
      { type: "text", text: buildSystemPrompt(brandName, language) },
      // Identical across every visitor's question in this region today -- caching it
      // means the 2nd+ query only pays cache-read price on this block instead of full
      // input price. Same caching concept cron/extract.ts already uses.
      { type: "text", text: `This region's specials and events:\n${context}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [...historyMessages, { role: "user", content: trimmed }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const answer = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "Sorry, I couldn't come up with an answer.";
  const tokensUsed =
    response.usage.input_tokens +
    response.usage.output_tokens +
    (response.usage.cache_creation_input_tokens ?? 0) +
    (response.usage.cache_read_input_tokens ?? 0);

  return { answer, tokensUsed };
}
