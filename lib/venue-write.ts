import type { SpecialCategory } from "@/db/schema";

// Pure builders for the admin inbox's "apply from the reply" actions. They only build values; the API route
// does the writing, and only after the admin clicks and confirms. Hand-entered specials follow the project's
// rule: source_url is null so the nightly cron never refreshes or archives them.

export interface SpecialInput {
  title: string;
  description?: string | null;
  priceCents?: number | null;
  daysOfWeek: number[]; // 0 = Sunday .. 6 = Saturday; empty or all seven means every day
  startTime?: string | null;
  endTime?: string | null;
  category: SpecialCategory;
}

export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

// Listings show numbers as "873 536-1077".
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  return `${ten.slice(0, 3)} ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export function appendNote(existing: string | null, date: string, text: string): string {
  const line = `${date} update: ${text}`;
  return existing && existing.trim() ? `${existing.trim()} ${line}` : line;
}

export function buildSpecialRows(
  venue: { id: number; regionId: number },
  input: SpecialInput,
  now: Date,
  isoDate: string
) {
  const days = [...new Set(input.daysOfWeek.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  const dayValues: (number | null)[] = days.length === 0 || days.length === 7 ? [null] : days;
  const description = input.description?.trim() ? input.description.trim() : null;
  return dayValues.map((dayOfWeek) => ({
    venueId: venue.id,
    regionId: venue.regionId,
    title: input.title.trim(),
    description,
    priceCents: input.priceCents ?? null,
    dayOfWeek,
    isMonthly: false,
    startTime: normalizeTime(input.startTime),
    endTime: normalizeTime(input.endTime),
    category: input.category,
    lastVerifiedAt: now,
    sourceUrl: null,
    confidence: 1,
    extractionNotes: `Hand-entered ${isoDate} from the venue's email reply (admin inbox).`,
  }));
}
