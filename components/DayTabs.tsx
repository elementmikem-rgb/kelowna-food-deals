"use client";

import { useEffect, useRef } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // On mobile this row overflows and clips (7 day buttons rarely all fit at
  // once) -- without this, the selected day (usually today) can land
  // partially or fully off-screen with no visible sign there's more to
  // scroll to, so a visitor can't tell today's filter is even active.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <div className="relative -mx-4">
      <div ref={scrollerRef} className="flex gap-2 overflow-x-auto pb-1 px-4 no-scrollbar">
        {DAYS.map((dow) => {
          const isSelected = dow === selected;
          const isToday = dow === today;
          return (
            <button
              key={dow}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelect(dow)}
              data-selected={isSelected}
              className={`press-pill shrink-0 rounded-full px-4 py-1.5 text-sm font-mono-tabular border ${
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
      {/* Fades the right edge so an overflowing row visibly continues instead
          of clipping with no indication there's more to scroll to. */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
    </div>
  );
}
