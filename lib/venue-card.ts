import { formatPrice } from "./format";
import { isStale } from "./time";
import type { Language } from "./i18n";

// Picks the single deal line shown on a venue's share card (the og:image chat apps
// preview when a venue link is pasted). Apps cache previews for days, so this is a
// standing deal, never an "on now" claim: daily deals first, then weekday-only ones
// (with the day named so the card doesn't imply it runs every day), then monthly.

const DAY_FULL = {
  en: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
} as const;
const DAY_ABBR = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fr: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
} as const;

const MAX_DEAL_CHARS = 48;

export interface CardSpecial {
  title: string;
  priceCents: number | null;
  dayOfWeek: number | null;
  isMonthly: boolean;
  lastVerifiedAt: Date;
}

export function truncateForCard(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 3).trimEnd()}...`;
}

// Region brand names end in a fixed suffix ("Kelowna Food Deals", "Granby Bons Plans").
export function cityFromBrand(brandName: string): string {
  return brandName.replace(/ (Food Deals|Spéciaux alimentaires|Bons Plans)$/i, "").trim();
}

// Sized for the ~520px text column, which wraps long names onto up to three lines.
export function venueNameFontSize(name: string): number {
  const n = name.length;
  return n > 40 ? 40 : n > 30 ? 46 : n > 22 ? 54 : n > 14 ? 70 : 88;
}

function scheduleRank(s: CardSpecial): number {
  if (s.isMonthly) return 2;
  return s.dayOfWeek === null ? 0 : 1;
}

function titleNamesDay(title: string, dow: number, lang: Language): boolean {
  const t = title.toLowerCase();
  if (t.includes(DAY_FULL[lang][dow])) return true;
  const abbr = DAY_ABBR[lang][dow].toLowerCase().replace(".", "");
  return new RegExp(`(^|[^a-zà-ÿ])${abbr}($|[^a-zà-ÿ])`).test(t);
}

export function pickCardDeal(specials: CardSpecial[], lang: Language = "en", now: Date = new Date()): string | null {
  const ranked = specials
    .filter((s) => s.title.trim() && !isStale(s.lastVerifiedAt, now))
    .sort(
      (a, b) =>
        scheduleRank(a) - scheduleRank(b) ||
        Number(a.priceCents === null) - Number(b.priceCents === null) ||
        (a.priceCents ?? 0) - (b.priceCents ?? 0) ||
        a.title.localeCompare(b.title)
    );
  const best = ranked[0];
  if (!best) return null;

  let line = truncateForCard(best.title, MAX_DEAL_CHARS);
  const price = formatPrice(best.priceCents);
  if (price && !best.title.includes("$")) line += `, ${price}`;
  if (!best.isMonthly && best.dayOfWeek !== null && !titleNamesDay(best.title, best.dayOfWeek, lang)) {
    line += ` (${DAY_ABBR[lang][best.dayOfWeek]})`;
  }
  return line;
}
