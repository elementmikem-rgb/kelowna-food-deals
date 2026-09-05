"use client";

import { dowShortName } from "@/lib/time";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function DayTabs({
  selected,
  today,
  onSelect,
}: {
  selected: number;
  today: number;
  onSelect: (dow: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
      {DAYS.map((dow) => {
        const isSelected = dow === selected;
        const isToday = dow === today;
        return (
          <button
            key={dow}
            onClick={() => onSelect(dow)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-mono-tabular border transition-colors ${
              isSelected
                ? "bg-accent text-background border-accent"
                : "bg-transparent text-muted border-border hover:border-muted"
            }`}
          >
            {dowShortName(dow)}
            {isToday && !isSelected && (
              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle" />
            )}
          </button>
        );
      })}
    </div>
  );
}
