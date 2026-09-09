import type { EventType } from "../db/schema";

// Shared by every event scraper (Castanet, NowMedia, ...) so "what type of
// event is this" and "what does it cost to get in" are classified the same
// way everywhere, regardless of which site the listing came from.
export function classifyEventType(title: string, description: string): EventType {
  const text = `${title} ${description}`.toLowerCase();
  if (/karaoke/.test(text)) return "karaoke";
  if (/trivia/.test(text)) return "trivia";
  if (/\blive music\b|\bband\b|\bdj\b/.test(text)) return "live_music";
  return "other";
}

// Real listings write the price on either side of the keyword ("$20 at the
// door", "Tickets $25"), and single-decimal amounts ("$12.5") are common.
const COVER_KEYWORDS = "cover|tickets?|admission|door|advance|presale|pre-sale|entry";
const AMOUNT_THEN_KEYWORD = new RegExp(
  `\\$(\\d+(?:\\.\\d{1,2})?)\\s*(?:[a-z]+\\s+){0,2}(?:${COVER_KEYWORDS})\\b`,
  "gi"
);
const KEYWORD_THEN_AMOUNT = new RegExp(
  `\\b(?:${COVER_KEYWORDS})\\b(?:\\s+[a-z]+){0,2}\\s*:?\\s*\\$(\\d+(?:\\.\\d{1,2})?)`,
  "gi"
);

export function parseCoverCharge(description: string): number | null {
  const amounts: number[] = [];
  for (const re of [AMOUNT_THEN_KEYWORD, KEYWORD_THEN_AMOUNT]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(description)) !== null) {
      amounts.push(Math.round(parseFloat(match[1]) * 100));
    }
  }
  if (amounts.length === 0) return null;
  // Ranges like "$20 advance / $25 door": show the advance (lower) price,
  // which is the one most attendees actually pay.
  return Math.min(...amounts);
}

// Some CMSes double-encode entities (e.g. a literal "&ndash;" survives
// cheerio's normal decoding), so decode common ones a second pass.
export function decodeEntities(text: string): string {
  return text
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

export function pacificToday(): Date {
  const parts = new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" }).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}
