"use client";

import Link from "next/link";
import { CATEGORY_LABELS, t, type Language } from "@/lib/i18n";
import type { SpecialCategory } from "@/db/schema";

const CATEGORIES: SpecialCategory[] = [
  "happy_hour",
  "food_special",
  "wing_night",
  "other",
];

export function CategoryFilter({
  selected,
  onSelect,
  lang = "en",
  regionSlug,
}: {
  selected: SpecialCategory | "all";
  onSelect: (category: SpecialCategory | "all") => void;
  lang?: Language;
  // The Monthly link chip appended after these category filters needs its
  // own href -- unlike the others, it navigates to a whole other page
  // instead of filtering this one, so it's not part of the onSelect model.
  regionSlug: string;
}) {
  const options: (SpecialCategory | "all")[] = ["all", ...CATEGORIES];
  const chipClass =
    "press-pill shrink-0 rounded-full px-3 py-1 text-xs uppercase tracking-wide border";
  return (
    <div className="relative -mx-4">
      <div className="flex gap-2 overflow-x-auto pb-1 px-4 no-scrollbar">
        {options.map((opt) => {
          const isSelected = opt === selected;
          const label = opt === "all" ? t(lang).filters.allCategories : CATEGORY_LABELS[lang][opt];
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              data-selected={isSelected}
              className={`${chipClass} ${
                isSelected
                  ? "bg-surface-raised text-accent border-accent-dim"
                  : "bg-transparent text-muted-2 border-border hover:border-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
        <Link
          href={`/${regionSlug}/monthly`}
          className={`${chipClass} bg-transparent text-muted-2 border-border hover:border-muted`}
        >
          {t(lang).nav.monthly}
        </Link>
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
    </div>
  );
}
