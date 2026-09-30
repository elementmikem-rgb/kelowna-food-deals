// Single source of truth for the /[region]/[day] URL segments. Index matches
// SpecialsBoard/DayTabs/lib/time.ts's day-of-week numbering (0=Sun..6=Sat).
// Used by app/[region]/[day]/page.tsx (route validation), app/sitemap.ts
// (listing the pages), and AboutSection.tsx (linking to them) -- all three
// must agree on this exact order, so they import it from here rather than
// each keeping their own copy.
export const DAY_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DaySlug = (typeof DAY_SLUGS)[number];

export function dayFromSlug(slug: string): number | null {
  const idx = DAY_SLUGS.indexOf(slug as DaySlug);
  return idx === -1 ? null : idx;
}

export function dayLabel(dow: number): string {
  return DAY_SLUGS[dow][0].toUpperCase() + DAY_SLUGS[dow].slice(1);
}
