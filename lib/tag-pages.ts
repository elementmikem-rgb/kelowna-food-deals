import { tagSpecial, TAG_SLUGS, type TaggableSpecial } from "./special-tags";

// A beer / wine / cocktail landing page is only worth indexing, linking and listing in the sitemap when
// the region really has a few such specials; a region with none would be a thin, empty page.
export const MIN_TAG_PAGE_SPECIALS = 5;

export function tagPageSlugs(rows: TaggableSpecial[]): string[] {
  const counts: Record<string, number> = {};
  for (const r of rows) for (const t of tagSpecial(r)) counts[t] = (counts[t] ?? 0) + 1;
  return Object.entries(TAG_SLUGS)
    .filter(([, tag]) => (counts[tag] ?? 0) >= MIN_TAG_PAGE_SPECIALS)
    .map(([slug]) => slug);
}
