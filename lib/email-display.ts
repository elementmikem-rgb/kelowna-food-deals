// Display helpers for plain-text inbound email in the admin inbox: tidy the text, then turn URLs
// into short, clickable links (a Brevo tracking link is several hundred characters of noise).

export type Token =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

// Inline image placeholders from Outlook signatures, e.g. "[cid:01cb6ffb-4ce2-...]".
export function cleanBodyText(text: string): string {
  return text
    .replace(/\[cid:[^\]\s]*\]\s*/gi, "")
    .replace(/([^\s<])(<https?:\/\/)/g, "$1 $2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const URL_RE = /<?(https?:\/\/[^\s<>"]+)>?/g;
const TRAILING = /[.,;:!?)\]]+$/;

export function shortLabel(href: string): string {
  try {
    const u = new URL(href);
    const path = u.pathname === "/" ? "" : u.pathname;
    const full = u.host + path;
    if (href.length > 60) return `${u.host}/…`;
    return full.replace(/\/$/, "");
  } catch {
    return href.length > 40 ? href.slice(0, 40) + "…" : href;
  }
}

export function tokenizeLinks(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    let href = m[1];
    const idx = m.index ?? 0;
    const bracketed = m[0].startsWith("<");
    let trailing = "";
    if (!bracketed) {
      const t = href.match(TRAILING);
      if (t) { trailing = t[0]; href = href.slice(0, -trailing.length); }
    }
    if (idx > last) out.push({ type: "text", value: text.slice(last, idx) });
    out.push({ type: "link", href, label: shortLabel(href) });
    if (trailing) out.push({ type: "text", value: trailing });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out.length ? out : [{ type: "text", value: text }];
}

// Preview line for list rows: shorten tracking URLs to their host and drop inline-image placeholders
// so the snippet reads like a sentence.
export function tidySnippet(s: string): string {
  return s
    .replace(/\[cid:[^\]\s]*\]/gi, "")
    .replace(/<?https?:\/\/([^\s/<>]+)[^\s<>]*>?/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
