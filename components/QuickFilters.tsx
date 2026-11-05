"use client";

import type { Language } from "@/lib/i18n";
import { filterText, type WhenMode } from "@/lib/board-filters";
import type { SpecialTag } from "@/lib/special-tags";
import { withViewTransition } from "@/lib/view-transition";

const chipBase = "press-pill hit-44 shrink-0 rounded-full px-3 py-1 text-xs uppercase tracking-wide border";
const chipOn = "bg-surface-raised text-accent border-accent-dim";
const chipOff = "bg-transparent text-muted-2 border-border hover:border-muted";

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => withViewTransition(onClick)}
      aria-pressed={on}
      aria-label={label}
      data-selected={on}
      className={`${chipBase} ${on ? chipOn : chipOff}`}
    >
      {children}
    </button>
  );
}

export interface ActiveFilter {
  key: string;
  label: string;
  onClear: () => void;
}

// The only filters on the page itself: the five most-used ones and a button for everything else.
// Anything switched on that is not one of these five shows as a removable tag underneath, so what is
// narrowing the list is always visible and one tap from being undone.
export function QuickFilters({
  lang = "en",
  timed,
  counts,
  when,
  onWhen,
  tag,
  onTag,
  under10,
  onUnder10,
  activeCount,
  extras,
  onOpenSheet,
  onClearAll,
}: {
  lang?: Language;
  // True only when looking at today with the clock read in the browser.
  timed: boolean;
  counts: { now: number; soon: number; under10: number; tags: Record<SpecialTag, number> };
  when: WhenMode;
  onWhen: (w: WhenMode) => void;
  tag: SpecialTag | "all";
  onTag: (t: SpecialTag | "all") => void;
  under10: boolean;
  onUnder10: (v: boolean) => void;
  activeCount: number;
  extras: ActiveFilter[];
  onOpenSheet: () => void;
  onClearAll: () => void;
}) {
  const L = filterText(lang);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative -mx-4">
        <div className="flex gap-2 overflow-x-auto pt-2 pb-3 -mt-2 -mb-2 px-4 no-scrollbar">
          <button
            type="button"
            onClick={onOpenSheet}
            aria-haspopup="dialog"
            className={`${chipBase} flex items-center gap-1.5 ${activeCount > 0 ? chipOn : "bg-surface text-foreground border-border hover:border-muted"}`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {L.filters}
            {activeCount > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] leading-4 text-background">{activeCount}</span>}
          </button>
          {timed && (counts.now > 0 || when === "now") && (
            <Chip on={when === "now"} onClick={() => onWhen(when === "now" ? "any" : "now")}>
              {L.now} · {counts.now}
            </Chip>
          )}
          {timed && (counts.soon > 0 || when === "soon") && (
            <Chip on={when === "soon"} onClick={() => onWhen(when === "soon" ? "any" : "soon")}>
              {L.soon} · {counts.soon}
            </Chip>
          )}
          {(counts.tags.food > 0 || tag === "food") && (
            <Chip on={tag === "food"} onClick={() => onTag(tag === "food" ? "all" : "food")}>
              {L.food}
            </Chip>
          )}
          {(counts.tags.drink > 0 || tag === "drink") && (
            <Chip on={tag === "drink"} onClick={() => onTag(tag === "drink" ? "all" : "drink")}>
              {L.drink}
            </Chip>
          )}
          {(counts.under10 > 0 || under10) && (
            <Chip on={under10} onClick={() => onUnder10(!under10)}>
              {L.under10}
            </Chip>
          )}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
      </div>

      {extras.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {extras.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.onClear}
              aria-label={L.removeFilter(f.label)}
              className="press-pill flex items-center gap-1 rounded-full border border-accent-dim bg-surface-raised px-2.5 py-0.5 text-xs text-accent"
            >
              {f.label}
              <span aria-hidden="true">✕</span>
            </button>
          ))}
          <button type="button" onClick={onClearAll} className="text-xs text-muted-2 underline hover:text-foreground">
            {L.clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
