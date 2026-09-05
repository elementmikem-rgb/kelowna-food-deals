"use client";

import { useMemo, useState } from "react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function EventsCalendar({
  eventDates,
  selectedDate,
  onSelectDate,
  todayKey,
}: {
  eventDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  todayKey: string;
}) {
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth - 1); // 0-indexed

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: { day: number | null; key: string | null }[] = [];
    for (let i = 0; i < startWeekday; i++) result.push({ day: null, key: null });
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ day: d, key: dateKey(viewYear, viewMonth, d) });
    }
    return result;
  }, [viewYear, viewMonth]);

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="press-pill w-7 h-7 rounded-full border border-border text-muted hover:border-muted flex items-center justify-center"
        >
          ‹
        </button>
        <p className="font-display text-sm text-foreground">
          {MONTH_LABELS[viewMonth]} {viewYear}
        </p>
        <button
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="press-pill w-7 h-7 rounded-full border border-border text-muted hover:border-muted flex items-center justify-center"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-[10px] text-muted-2 uppercase font-mono-tabular">
            {w}
          </span>
        ))}
        {cells.map((cell, i) => {
          if (cell.day === null) return <span key={i} />;
          const hasEvents = eventDates.has(cell.key!);
          const isSelected = selectedDate === cell.key;
          const isToday = cell.key === todayKey;
          return (
            <button
              key={i}
              disabled={!hasEvents}
              onClick={() => onSelectDate(isSelected ? null : cell.key)}
              className={`press-pill relative aspect-square rounded-full text-xs font-mono-tabular flex items-center justify-center ${
                isSelected
                  ? "bg-accent text-background"
                  : hasEvents
                    ? "text-foreground hover:bg-surface-raised"
                    : "text-muted-2/50 cursor-default"
              } ${isToday && !isSelected ? "border border-accent-dim/50" : ""}`}
            >
              {cell.day}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          onClick={() => onSelectDate(null)}
          className="mt-3 text-xs text-accent-dim underline"
        >
          Clear date filter
        </button>
      )}
    </div>
  );
}
