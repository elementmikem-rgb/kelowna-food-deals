"use client";

import { EVENT_TYPE_LABELS, t, type Language } from "@/lib/i18n";
import type { EventType } from "@/db/schema";

const EVENT_TYPES: EventType[] = ["live_music", "trivia", "karaoke", "sports_night", "other"];

export function EventTypeFilter({
  selected,
  onSelect,
  lang = "en",
}: {
  selected: EventType | "all";
  onSelect: (type: EventType | "all") => void;
  lang?: Language;
}) {
  const options: (EventType | "all")[] = ["all", ...EVENT_TYPES];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
      {options.map((opt) => {
        const isSelected = opt === selected;
        const label = opt === "all" ? t(lang).filters.allTypes : EVENT_TYPE_LABELS[lang][opt];
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs uppercase tracking-wide border transition-colors ${
              isSelected
                ? "bg-surface-raised text-accent-dim border-accent-dim"
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
