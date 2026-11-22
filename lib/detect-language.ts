// Cheap heuristic language detection for short email/inbox text.
// Returns "fr", "en", or "unknown" with a confidence in [0, 1].
// Does not make network calls or load a model.

const FR_STOPWORDS = new Set([
  "le", "la", "les", "des", "du", "un", "une",
  "et", "est", "nous", "vous", "pour", "avec",
  "que", "qui", "pas", "je", "merci", "bonjour",
]);

const EN_STOPWORDS = new Set([
  "the", "and", "is", "are", "you", "we",
  "for", "with", "that", "this", "not", "thanks", "hello",
]);

// Strip a line of its leading quote marker(s) if it's a quoted history line.
function isQuotedLine(line: string): boolean {
  return line.trimStart().startsWith(">");
}

// Return true if this line marks the start of an email separator / footer
// that should be ignored along with everything below it.
function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (/^_{10,}$/.test(trimmed)) return true;
  if (/^(De\s*:|From:)/i.test(trimmed)) return true;
  return false;
}

// Extract the analysable content from a raw email body:
// - Remove quoted history lines (starting with >)
// - Truncate at separator lines (10+ underscores, "De :", "From:")
// - Remove URLs and email addresses
function extractContent(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];

  for (const line of lines) {
    if (isSeparatorLine(line)) break;
    if (isQuotedLine(line)) continue;
    kept.push(line);
  }

  let content = kept.join(" ");

  // Remove URLs
  content = content.replace(/https?:\/\/\S+/g, " ");
  // Remove email addresses
  content = content.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, " ");

  return content;
}

// Count how many letters (a-z, ignoring digits/punctuation/spaces) are in the string.
function letterCount(s: string): number {
  return (s.match(/[a-zA-ZÀ-ɏ]/g) ?? []).length;
}

// Normalize for stopword comparison: lowercase and strip accents.
function normalizeWord(w: string): string {
  return w
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function detectLanguage(text: string): { lang: "fr" | "en" | "unknown"; confidence: number } {
  const content = extractContent(text);

  if (letterCount(content) < 12) {
    return { lang: "unknown", confidence: 0 };
  }

  // Split into words and normalize each one for stopword matching
  const words = content.split(/\s+/).map(normalizeWord).filter((w) => w.length > 0);

  let frCount = 0;
  let enCount = 0;

  for (const word of words) {
    if (FR_STOPWORDS.has(word)) frCount++;
    if (EN_STOPWORDS.has(word)) enCount++;
  }

  const total = frCount + enCount;

  if (total === 0) {
    // No stopwords found -- fall back to diacritic presence as a French signal.
    // French uses accented characters far more than English in business email.
    const hasFrenchDiacritics = /[éèêëàâîïôùûüÿçœæÉÈÊËÀÂÎÏÔÙÛÜŸÇŒÆ]/.test(content);
    if (hasFrenchDiacritics) {
      return { lang: "fr", confidence: 0.6 };
    }
    return { lang: "unknown", confidence: 0 };
  }

  const frConfidence = frCount / total;
  const enConfidence = enCount / total;

  if (frConfidence > enConfidence) {
    return { lang: "fr", confidence: frConfidence };
  }
  if (enConfidence > frConfidence) {
    return { lang: "en", confidence: enConfidence };
  }

  // Equal counts: genuinely ambiguous
  return { lang: "unknown", confidence: 0.5 };
}
