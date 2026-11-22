export interface SpecialSuggestion {
  title: string;
  description: string | null;
  priceCents: number | null;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  category: "happy_hour" | "food_special" | "wing_night" | "other";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function removeAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(s: string): string {
  return removeAccents(s.toLowerCase());
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Strips quoted reply history so we only parse the author's own words.
 * Removes lines starting with ">" and everything from the first separator
 * line (10+ underscores, "De :" or "From:") onward.
 */
function stripHistory(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^_{10,}/.test(trimmed)) break;
    if (/^De\s*:/i.test(trimmed)) break;
    if (/^From:/i.test(trimmed)) break;
    if (/^>/.test(line)) continue;
    out.push(line);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Day parsing
// ---------------------------------------------------------------------------

/**
 * Map from each normalized alias to the day index (0=Sunday..6=Saturday).
 * Sorted longest-first so regex alternation matches the most specific alias.
 */
const DAY_ALIASES: [string[], number][] = [
  [["dimanche", "dim", "sunday", "sun"], 0],
  [["lundi", "lun", "monday", "mon"], 1],
  [["mardi", "mar", "tuesday", "tue", "tues"], 2],
  [["mercredi", "mer", "wednesday", "wed"], 3],
  [["jeudi", "jeu", "thursday", "thu", "thurs"], 4],
  [["vendredi", "ven", "friday", "fri"], 5],
  [["samedi", "sam", "saturday", "sat"], 6],
];

const DAY_MAP: Record<string, number> = {};
for (const [aliases, idx] of DAY_ALIASES) {
  for (const alias of aliases) {
    DAY_MAP[alias] = idx;
  }
}

const ALL_ALIASES_DESC = Object.keys(DAY_MAP).sort((a, b) => b.length - a.length);

const escapedAliases = ALL_ALIASES_DESC.map((a) =>
  a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
);
const dayAliasPattern = escapedAliases.join("|");

function findDayIndex(word: string): number | null {
  const key = normalize(word);
  return key in DAY_MAP ? DAY_MAP[key] : null;
}

/**
 * Expands a range [start, end] going forward through the week, wrapping if needed.
 */
function daysInRange(start: number, end: number): number[] {
  if (start === end) return [start];
  const result: number[] = [];
  let current = start;
  while (current !== end) {
    result.push(current);
    current = (current + 1) % 7;
  }
  result.push(end);
  return result;
}

/**
 * Parses day-of-week references from free-form French/English text.
 * Returns sorted unique day indices (0=Sunday..6=Saturday).
 * Ignores quoted history lines and content after separator lines.
 */
export function parseDays(text: string): number[] {
  const clean = stripHistory(text);
  const norm = normalize(clean);

  // All-day shortcuts
  if (
    /\b(tous les jours|chaque jour|every day|daily|quotidien)\b/.test(norm)
  ) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const days = new Set<number>();

  // Range pattern: optional "du " + dayName + connector + dayName
  // Connectors: au, to, a (normalized from a/a), hyphen
  const rangeReStr =
    `(?:du\\s+)?\\b(${dayAliasPattern})s?\\s*(?:au|to|a|-)\\s*(${dayAliasPattern})s?\\b`;
  const rangeRe = new RegExp(rangeReStr, "gi");

  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(norm)) !== null) {
    const startDay = findDayIndex(m[1]);
    const endDay = findDayIndex(m[2]);
    if (startDay !== null && endDay !== null) {
      for (const d of daysInRange(startDay, endDay)) {
        days.add(d);
      }
    }
  }

  // Individual day mentions (union with any range results)
  const dayRe = new RegExp(`\\b(${dayAliasPattern})s?\\b`, "gi");
  while ((m = dayRe.exec(norm)) !== null) {
    const idx = findDayIndex(m[1]);
    if (idx !== null) days.add(idx);
  }

  return [...days].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Time parsing
// ---------------------------------------------------------------------------

function toHHMM(h: string, min: string | undefined, ampm: string | null): string {
  let hours = parseInt(h, 10);
  const minutes = min ? parseInt(min, 10) : 0;
  if (ampm === "pm" && hours !== 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Extracts a start and end time from free-form text.
 * Returns HH:MM 24-hour strings or null for each bound.
 */
export function parseTimeRange(text: string): {
  start: string | null;
  end: string | null;
} {
  const norm = normalize(text);
  let m: RegExpExecArray | null;

  // "jusqu a 2h" / "jusqua 2h" / "jusqu'a 2h" - end only
  m = /jusqu[a-z'\s]{0,10}(\d{1,2})h(\d{2})?/.exec(norm);
  if (m) return { start: null, end: toHHMM(m[1], m[2], null) };

  // "until Xpm" - end only
  m = /\buntil\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/.exec(norm);
  if (m) return { start: null, end: toHHMM(m[1], m[2], m[3]) };

  // "a partir de Xh" - start only
  m = /a\s+partir\s+de\s+(\d{1,2})h(\d{2})?/.exec(norm);
  if (m) return { start: toHHMM(m[1], m[2], null), end: null };

  // "from Xpm" - start only
  m = /\bfrom\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/.exec(norm);
  if (m) return { start: toHHMM(m[1], m[2], m[3]), end: null };

  // "5-8pm" - bare number dash bare number pm (both treated as pm)
  m = /\b(\d{1,2})-(\d{1,2})\s*pm\b/.exec(norm);
  if (m) {
    return {
      start: toHHMM(m[1], undefined, "pm"),
      end: toHHMM(m[2], undefined, "pm"),
    };
  }

  // "de 16h a 18h" / "16h a 18h" / "16h30 a 18h"
  m = /(?:de\s+)?(\d{1,2})h(\d{2})?\s+a\s+(\d{1,2})h(\d{2})?/.exec(norm);
  if (m) {
    return {
      start: toHHMM(m[1], m[2], null),
      end: toHHMM(m[3], m[4], null),
    };
  }

  // "16h-18h" or "16h30-18h"
  m = /(\d{1,2})h(\d{2})?-(\d{1,2})h(\d{2})?/.exec(norm);
  if (m) {
    return {
      start: toHHMM(m[1], m[2], null),
      end: toHHMM(m[3], m[4], null),
    };
  }

  // "4pm-6pm" / "4pm to 6pm" / "4 pm to 6 pm" / "10am-2pm"
  m =
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/.exec(
      norm
    );
  if (m) {
    return {
      start: toHHMM(m[1], m[2], m[3]),
      end: toHHMM(m[4], m[5], m[6]),
    };
  }

  // "17:00-19:00"
  m = /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/.exec(norm);
  if (m) {
    return {
      start: `${m[1]}:${m[2]}`,
      end: `${m[3]}:${m[4]}`,
    };
  }

  return { start: null, end: null };
}

// ---------------------------------------------------------------------------
// Price parsing
// ---------------------------------------------------------------------------

function extractPriceCents(text: string): number | null {
  // Try "$AMOUNT" and "AMOUNT $" patterns
  const patternsStr = [
    /\$(\d+(?:[.,]\d{1,2})?)/g,
    /(\d+(?:[.,]\d{1,2})?)\s*\$/g,
  ];

  for (const re of patternsStr) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const numStr = m[1].replace(",", ".");
      const num = parseFloat(numStr);
      const intPart = Math.floor(num);

      // Skip years (2000-2099 range)
      if (intPart >= 2000 && intPart <= 2099) continue;
      // Skip large numbers that are likely phone numbers or street numbers
      if (intPart >= 10000) continue;

      return Math.round(num * 100);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Category and title detection
// ---------------------------------------------------------------------------

function detectCategory(
  norm: string
): "happy_hour" | "food_special" | "wing_night" | "other" {
  if (/\baile|wing/.test(norm)) return "wing_night";
  if (/\bhappy hour\b|\bapero\b|\baperitif\b|\b5 a 7\b|\b5a7\b/.test(norm))
    return "happy_hour";
  if (
    /\b(pizza|burgers?|nachos?|tacos?|brunch|souper|poutine|menus?|plats?)\b/.test(
      norm
    )
  )
    return "food_special";
  return "other";
}

function buildTitle(
  originalText: string,
  category: "happy_hour" | "food_special" | "wing_night" | "other"
): string {
  const norm = normalize(originalText);

  if (category === "wing_night") {
    if (/ailes de poulet/.test(norm)) {
      const m = originalText.match(/ailes de poulet/i);
      if (m) return capitalize(m[0]);
    }
    if (/\bailes\b/.test(norm)) return "Ailes";
    if (/wing night/.test(norm)) return "Wing night";
    if (/\bwings?\b/.test(norm)) return "Chicken wings";
    return "Wing night";
  }

  if (category === "happy_hour") {
    if (/happy hour/.test(norm)) return "Happy hour";
    if (/\b5 a 7\b/.test(norm)) return "5 a 7";
    if (/\bapero\b|\baperitif\b/.test(norm)) return "Apero";
    return "Happy hour";
  }

  if (category === "food_special") {
    const foods: [RegExp, string][] = [
      [/\bpoutine\b/, "Poutine"],
      [/\bbrunch\b/, "Brunch"],
      [/\bsouper\b/, "Souper"],
      [/\bpizza\b/, "Pizza"],
      [/\bburgers?\b/, "Burger"],
      [/\bnachos?\b/, "Nachos"],
      [/\btacos?\b/, "Tacos"],
      [/\bmenus?\b/, "Menu"],
      [/\bplats?\b/, "Plat"],
    ];
    for (const [re, label] of foods) {
      if (re.test(norm)) return label;
    }
    return "Food special";
  }

  return "Special";
}

// ---------------------------------------------------------------------------
// Negative reply detection
// ---------------------------------------------------------------------------

function isNegativeReply(norm: string): boolean {
  return (
    /\baucun\b/.test(norm) ||
    /\bpas de\b/.test(norm) ||
    /n.?avons pas\b/.test(norm) ||
    /\bno specials?\b/.test(norm) ||
    /\bdo not have\b/.test(norm) ||
    /\bnothing\b/.test(norm) ||
    /\bhaven.t\b/.test(norm)
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parses a business owner's email reply and extracts structured data for
 * pre-filling an "Add special" form. Returns null when nothing recognizable
 * is found (no price, no days, no keyword) or when the reply is a negative.
 */
export function suggestSpecial(replyText: string): SpecialSuggestion | null {
  const norm = normalize(replyText);

  if (isNegativeReply(norm)) return null;

  const activeText = stripHistory(replyText);
  const activeNorm = normalize(activeText);

  const daysOfWeek = parseDays(activeText);
  const { start: startTime, end: endTime } = parseTimeRange(activeText);
  const priceCents = extractPriceCents(activeText);
  const category = detectCategory(activeNorm);

  // Return null only when there is nothing recognizable at all
  if (priceCents === null && daysOfWeek.length === 0 && category === "other") {
    return null;
  }

  const title = buildTitle(activeText, category);

  return {
    title: title.slice(0, 60),
    description: null,
    priceCents,
    daysOfWeek,
    startTime,
    endTime,
    category,
  };
}
