"use client";

import type { Language } from "@/lib/i18n";
import { CHIP_TAGS, TAG_LABELS, type SpecialTag } from "@/lib/special-tags";
import { withViewTransition } from "@/lib/view-transition";

export type WhenMode = "any" | "now" | "soon";

const WHEN_LABELS = {
  en: { now: "On now", soon: "Starting soon", under10: "Under $10", late: "Late night" },
  fr: { now: "En cours", soon: "Bientôt", under10: "Moins de 10 $", late: "Tard le soir" },
};

const chipBase = "press-pill hit-44 shrink-0 rounded-full px-3 py-1 text-xs uppercase tracking-wide border";
const chipOn = "bg-surface-raised text-accent border-accent-dim";
const chipOff = "bg-transparent text-muted-2 border-border hover:border-muted";

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => withViewTransition(onClick)} data-selected={on} aria-pressed={on} className={`${chipBase} ${on ? chipOn : chipOff}`}>
      {children}
    </button>
  );
}

// Two scrolling chip rows: WHEN (what is running now, what is about to, what is cheap or late) and WHAT
// (food, drinks, wings, beer ...). Chips with nothing behind them today are left out so a tap never
// lands on an empty board; a chip that is switched on always stays so it can be switched off.
export function WhatFilter({
  lang = "en",
  timed,
  when,
  onWhen,
  under10,
  onUnder10,
  late,
  onLate,
  tag,
  onTag,
  counts,
}: {
  lang?: Language;
  // True only when the visitor is looking at today and the clock has been read in the browser.
  timed: boolean;
  when: WhenMode;
  onWhen: (w: WhenMode) => void;
  under10: boolean;
  onUnder10: (v: boolean) => void;
  late: boolean;
  onLate: (v: boolean) => void;
  tag: SpecialTag | "all";
  onTag: (t: SpecialTag | "all") => void;
  counts: { tags: Record<SpecialTag, number>; now: number; soon: number; under10: number; late: number };
}) {
  const L = WHEN_LABELS[lang === "fr" ? "fr" : "en"];
  const T = TAG_LABELS[lang === "fr" ? "fr" : "en"];
  const whenChips = (
    <>
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
      {(counts.under10 > 0 || under10) && (
        <Chip on={under10} onClick={() => onUnder10(!under10)}>
          {L.under10}
        </Chip>
      )}
      {(counts.late > 0 || late) && (
        <Chip on={late} onClick={() => onLate(!late)}>
          {L.late}
        </Chip>
      )}
    </>
  );
  const hasWhen = (timed && (counts.now > 0 || counts.soon > 0)) || counts.under10 > 0 || counts.late > 0 || under10 || late || when !== "any";
  return (
    <div className="flex flex-col gap-2">
      {hasWhen && (
        <div className="relative -mx-4">
          <div className="flex gap-2 overflow-x-auto pt-2 pb-3 -mt-2 -mb-2 px-4 no-scrollbar">{whenChips}</div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
        </div>
      )}
      <div className="relative -mx-4">
        <div className="flex gap-2 overflow-x-auto pt-2 pb-3 -mt-2 -mb-2 px-4 no-scrollbar">
          <Chip on={tag === "all"} onClick={() => onTag("all")}>
            {lang === "fr" ? "Tout" : "Everything"}
          </Chip>
          {CHIP_TAGS.filter((c) => counts.tags[c] > 0 || tag === c).map((c) => (
            <Chip key={c} on={tag === c} onClick={() => onTag(tag === c ? "all" : c)}>
              {T[c]}
            </Chip>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
      </div>
    </div>
  );
}
