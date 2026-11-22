export interface SearchableThread {
  displayName: string;
  contactEmail: string | null;
  lastSubject: string;
  lastSnippet: string;
  lastAt: string; // ISO
  unreadCount: number;
  archived: boolean;
  hasAttachments: boolean;
  lastFromMe: boolean;
  starred?: boolean;
  snoozedUntil?: string | null;
  lang?: string | null;
}

export interface ParsedQuery {
  terms: string[];
  negated: string[];
  from: string[];
  subject: string[];
  is: string[]; // unread read starred snoozed
  has: string[]; // attachment
  in: "inbox" | "sent" | "archive" | "snoozed" | "starred" | "all" | null;
  before: Date | null;
  after: Date | null;
  lang: string | null;
}

// Tokenize a query string respecting quoted values, including operator:"quoted value" forms.
function tokenize(q: string): string[] {
  const tokens: string[] = [];
  // Three alternatives (order matters):
  // 1. operator:"quoted value" -- keep the whole thing as one token
  // 2. "quoted phrase" -- bare quoted phrase, extract content without quotes
  // 3. plain word
  const re = /(?:[^\s"]+:"[^"]*")|(?:"[^"]*")|(?:[^\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q)) !== null) {
    tokens.push(m[0]);
  }
  return tokens;
}

// Extract the value from a token like `operator:value` or `operator:"quoted value"`.
// Returns [operator, value] or null if not an operator token.
function splitOperator(token: string): [string, string] | null {
  const colonIdx = token.indexOf(":");
  if (colonIdx <= 0) return null;
  const op = token.slice(0, colonIdx).toLowerCase();
  let val = token.slice(colonIdx + 1);
  // Strip surrounding quotes from value if present
  if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
    val = val.slice(1, -1);
  }
  return [op, val];
}

// Parse a duration string like "7d", "2w", "1m" into milliseconds.
// Returns null for unrecognised formats.
function parseDurationMs(val: string): number | null {
  const m = /^(\d+)(d|w|m)$/i.exec(val);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (unit === "d") return n * 24 * 60 * 60 * 1000;
  if (unit === "w") return n * 7 * 24 * 60 * 60 * 1000;
  if (unit === "m") return n * 30 * 24 * 60 * 60 * 1000;
  return null;
}

// Known operators -- anything else is treated as a plain text term.
const KNOWN_OPS = new Set([
  "from", "subject", "is", "has", "in", "before", "after",
  "older_than", "newer_than", "lang",
]);

export function parseQuery(q: string): ParsedQuery {
  const pq: ParsedQuery = {
    terms: [],
    negated: [],
    from: [],
    subject: [],
    is: [],
    has: [],
    in: null,
    before: null,
    after: null,
    lang: null,
  };

  if (!q.trim()) return pq;

  const now = new Date();
  const tokens = tokenize(q.trim());

  for (const token of tokens) {
    // Bare quoted phrase (no leading operator)
    if (token.startsWith('"') && token.endsWith('"') && token.length >= 2) {
      pq.terms.push(token.slice(1, -1));
      continue;
    }

    // Negated term
    if (token.startsWith("-") && token.length > 1 && !token.includes(":")) {
      pq.negated.push(token.slice(1));
      continue;
    }

    const parts = splitOperator(token);
    if (!parts) {
      pq.terms.push(token);
      continue;
    }

    const [op, val] = parts;

    if (!KNOWN_OPS.has(op)) {
      // Unknown operator: treat the entire token as a plain text term
      pq.terms.push(token);
      continue;
    }

    switch (op) {
      case "from":
        pq.from.push(val);
        break;

      case "subject":
        pq.subject.push(val);
        break;

      case "is":
        pq.is.push(val.toLowerCase());
        break;

      case "has":
        pq.has.push(val.toLowerCase());
        break;

      case "in": {
        const v = val.toLowerCase();
        if (v === "anywhere") {
          pq.in = "all";
        } else if (
          v === "inbox" || v === "sent" || v === "archive" ||
          v === "snoozed" || v === "starred" || v === "all"
        ) {
          pq.in = v as ParsedQuery["in"];
        } else {
          pq.terms.push(token);
        }
        break;
      }

      case "before": {
        const d = new Date(`${val}T00:00:00Z`);
        if (!isNaN(d.getTime())) pq.before = d;
        else pq.terms.push(token);
        break;
      }

      case "after": {
        const d = new Date(`${val}T00:00:00Z`);
        if (!isNaN(d.getTime())) pq.after = d;
        else pq.terms.push(token);
        break;
      }

      case "older_than": {
        const ms = parseDurationMs(val);
        if (ms !== null) {
          const threshold = new Date(now.getTime() - ms);
          // Keep the stricter (earlier) of any existing before date
          if (pq.before === null || threshold < pq.before) pq.before = threshold;
        } else {
          pq.terms.push(token);
        }
        break;
      }

      case "newer_than": {
        const ms = parseDurationMs(val);
        if (ms !== null) {
          const threshold = new Date(now.getTime() - ms);
          // Keep the stricter (later) of any existing after date
          if (pq.after === null || threshold > pq.after) pq.after = threshold;
        } else {
          pq.terms.push(token);
        }
        break;
      }

      case "lang":
        pq.lang = val.toLowerCase();
        break;
    }
  }

  return pq;
}

// Normalize text for accent-insensitive, case-insensitive comparison.
function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchThread(t: SearchableThread, q: ParsedQuery, now: Date = new Date()): boolean {
  // 1. Scope filter
  if (q.in === null || q.in === "inbox") {
    if (t.archived) return false;
  } else if (q.in === "sent") {
    if (!t.lastFromMe) return false;
  } else if (q.in === "archive") {
    if (!t.archived) return false;
  } else if (q.in === "snoozed") {
    if (!t.snoozedUntil || new Date(t.snoozedUntil) <= now) return false;
  } else if (q.in === "starred") {
    if (!t.starred) return false;
  }
  // q.in === "all": no scope filter

  // 2. is: filters
  for (const filter of q.is) {
    if (filter === "unread" && t.unreadCount === 0) return false;
    if (filter === "read" && t.unreadCount > 0) return false;
    if (filter === "starred" && !t.starred) return false;
    if (filter === "snoozed") {
      if (!t.snoozedUntil || new Date(t.snoozedUntil) <= now) return false;
    }
  }

  // 3. has: filters
  for (const filter of q.has) {
    if (filter === "attachment" && !t.hasAttachments) return false;
  }

  // 4. from: filters (match contactEmail or displayName, substring, normalized)
  for (const f of q.from) {
    const fNorm = normalizeText(f);
    const emailMatch = normalizeText(t.contactEmail ?? "").includes(fNorm);
    const nameMatch = normalizeText(t.displayName).includes(fNorm);
    if (!emailMatch && !nameMatch) return false;
  }

  // 5. subject: filters (substring match on lastSubject, normalized)
  for (const s of q.subject) {
    if (!normalizeText(t.lastSubject).includes(normalizeText(s))) return false;
  }

  // 6. lang: filter
  if (q.lang !== null && t.lang !== q.lang) return false;

  // 7. Date filters (before/after are absolute Dates from parseQuery)
  const threadDate = new Date(t.lastAt);
  if (q.before !== null && threadDate >= q.before) return false;
  if (q.after !== null && threadDate <= q.after) return false;

  // 8. Bare terms (must all appear in the combined normalized thread text)
  if (q.terms.length > 0) {
    const threadText = normalizeText(
      [t.displayName, t.contactEmail ?? "", t.lastSubject, t.lastSnippet].join(" ")
    );
    for (const term of q.terms) {
      if (!threadText.includes(normalizeText(term))) return false;
    }
  }

  // 9. Negated terms (none must appear in the combined normalized thread text)
  if (q.negated.length > 0) {
    const threadText = normalizeText(
      [t.displayName, t.contactEmail ?? "", t.lastSubject, t.lastSnippet].join(" ")
    );
    for (const term of q.negated) {
      if (threadText.includes(normalizeText(term))) return false;
    }
  }

  return true;
}
