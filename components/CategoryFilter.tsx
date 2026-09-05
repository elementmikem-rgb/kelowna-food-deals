"use client";

import { CATEGORY_LABELS } from "@/lib/format";
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
}: {
  selected: SpecialCategory | "all";
  onSelect: (category: SpecialCategory | "all") => void;
}) {
  const options: (SpecialCategory | "all")[] = ["all", ...CATEGORIES];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
      {options.map((opt) => {
        const isSelected = opt === selected;
        const label = opt === "all" ? "All" : CATEGORY_LABELS[opt];
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs uppercase tracking-wide border transition-colors ${
              isSelected
                ? "bg-surface-raised text-accent border-accent-dim"
                : "bg-transparent text-muted-2 border-border hover:border-muted"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
