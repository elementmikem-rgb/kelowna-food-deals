"use client";

import type { Language } from "@/lib/i18n";
import { CHIP_TAGS, TAG_LABELS, type SpecialTag } from "@/lib/special-tags";
import { filterText } from "@/lib/board-filters";

// Which tags are worth offering as a filter for one list of specials: those that match some but not all of
// them, and only when at least two such tags exist (a single chip would just be the whole list again).
export function usefulTags(tagLists: SpecialTag[][]): SpecialTag[] {
  if (tagLists.length < 3) return [];
  const useful = CHIP_TAGS.filter((t) => {
    const n = tagLists.filter((l) => l.includes(t)).length;
    return n > 0 && n < tagLists.length;
  });
  return useful.length >= 2 ? useful : [];
}

export function TagChipRow({
  tags,
  selected,
  onSelect,
  lang = "en",
  className = "",
}: {
  tags: SpecialTag[];
  selected: SpecialTag | "all";
  onSelect: (t: SpecialTag | "all") => void;
  lang?: Language;
  className?: string;
}) {
  if (tags.length === 0) return null;
  const T = TAG_LABELS[lang === "fr" ? "fr" : "en"];
  const chip = "press-pill rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wide border";
  const on = "bg-surface-raised text-accent border-accent-dim";
  const off = "bg-transparent text-muted-2 border-border hover:border-muted";
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="group" aria-label={filterText(lang).what}>
      <button type="button" aria-pressed={selected === "all"} onClick={() => onSelect("all")} className={`${chip} ${selected === "all" ? on : off}`}>
        {filterText(lang).allTypes}
      </button>
      {tags.map((t) => (
        <button key={t} type="button" aria-pressed={selected === t} onClick={() => onSelect(selected === t ? "all" : t)} className={`${chip} ${selected === t ? on : off}`}>
          {T[t]}
        </button>
      ))}
    </div>
  );
}
