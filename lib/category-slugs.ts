import type { SpecialCategory } from "@/db/schema";

// Single source of truth for the /[region]/[slug] category URL segments --
// same pattern as lib/day-slugs.ts. "other" is deliberately excluded: it's a
// catch-all bucket, not a real search term anyone types, so a page for it
// would have no SEO value and would just be thin/duplicate content.
export const CATEGORY_SLUGS: Record<string, SpecialCategory> = {
  "happy-hour": "happy_hour",
  "food-specials": "food_special",
  "wing-night": "wing_night",
};

export function categoryFromSlug(slug: string): SpecialCategory | null {
  return CATEGORY_SLUGS[slug] ?? null;
}

const CATEGORY_PAGE_LABELS: Record<SpecialCategory, string> = {
  happy_hour: "Happy Hour",
  food_special: "Food Specials",
  wing_night: "Wing Night",
  other: "Other",
};

export function categoryPageLabel(category: SpecialCategory): string {
  return CATEGORY_PAGE_LABELS[category];
}
