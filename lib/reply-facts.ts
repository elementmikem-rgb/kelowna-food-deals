// Cheap, free extraction of facts from a venue's reply (no model calls): phone numbers and dollar prices.
// Used by the inbox venue panel to flag details that differ from the listing. It only reads text, it never
// writes anything.

// North American numbers: optional +1/1, area code (with or without brackets), 3-4 split, any of - . space.
const PHONE_RE = /(?<![\w/.:-])(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?![\w/]|\.\d)/g;

export function phoneDigits(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  return x.length === 10 && x === y;
}

export function extractPhones(text: string): string[] {
  // Drop URLs first so digits inside a tracking link never look like a phone number.
  const cleaned = text.replace(/https?:\/\/\S+/gi, " ");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of cleaned.matchAll(PHONE_RE)) {
    const raw = m[0].trim();
    const key = phoneDigits(raw);
    if (key.length !== 10 || seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

// "1$", "5,50 $", "$12.99"
const PRICE_RE = /\$\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?\$/g;

export function extractPrices(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PRICE_RE)) {
    const v = m[0].trim();
    if (!out.includes(v)) out.push(v);
  }
  return out;
}
