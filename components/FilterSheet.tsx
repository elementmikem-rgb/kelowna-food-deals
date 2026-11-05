"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CATEGORY_LABELS, type Language } from "@/lib/i18n";
import type { SpecialCategory } from "@/db/schema";
import { filterText, type WhenMode } from "@/lib/board-filters";
import { CHIP_TAGS, TAG_LABELS, type SpecialTag } from "@/lib/special-tags";

const CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];

const pill = "press-pill rounded-full px-3 py-1.5 text-xs uppercase tracking-wide border";
const pillOn = "bg-surface-raised text-accent border-accent-dim";
const pillOff = "bg-transparent text-muted-2 border-border hover:border-muted";

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`${pill} ${on ? pillOn : pillOff}`}>
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

// Everything that is not one of the five quick filters. A bottom sheet on a phone, a centred panel on a
// wider screen. Changes apply as you tap, so the button at the bottom only closes it and says how many
// places are left.
export function FilterSheet({
  open,
  onClose,
  lang = "en",
  regionSlug,
  timed,
  counts,
  when,
  onWhen,
  under10,
  onUnder10,
  late,
  onLate,
  tag,
  onTag,
  category,
  onCategory,
  cities,
  city,
  onCity,
  placeCount,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  lang?: Language;
  regionSlug: string;
  timed: boolean;
  counts: { now: number; soon: number; under10: number; late: number; tags: Record<SpecialTag, number> };
  when: WhenMode;
  onWhen: (w: WhenMode) => void;
  under10: boolean;
  onUnder10: (v: boolean) => void;
  late: boolean;
  onLate: (v: boolean) => void;
  tag: SpecialTag | "all";
  onTag: (t: SpecialTag | "all") => void;
  category: SpecialCategory | "all";
  onCategory: (c: SpecialCategory | "all") => void;
  cities: string[];
  city: string | "all";
  onCity: (c: string | "all") => void;
  placeCount: number;
  onClearAll: () => void;
}) {
  const L = filterText(lang);
  const T = TAG_LABELS[lang === "fr" ? "fr" : "en"];
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  // z-[70]: above the floating chat button (z-50), which otherwise sits on top of the Show button.
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={L.filters}
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-border bg-background shadow-xl outline-none sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-display text-xl text-foreground">{L.filters}</h2>
          <button type="button" onClick={onClose} aria-label={L.close} className="hit-44 rounded-full px-2 text-lg text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
          {timed && (
            <Section title={L.when}>
              <Pill on={when === "any"} onClick={() => onWhen("any")}>
                {L.anyTime}
              </Pill>
              <Pill on={when === "now"} onClick={() => onWhen("now")}>
                {L.now} · {counts.now}
              </Pill>
              <Pill on={when === "soon"} onClick={() => onWhen("soon")}>
                {L.soon} · {counts.soon}
              </Pill>
            </Section>
          )}

          <Section title={L.what}>
            <Pill on={tag === "all"} onClick={() => onTag("all")}>
              {L.everything}
            </Pill>
            {CHIP_TAGS.filter((c) => counts.tags[c] > 0 || tag === c).map((c) => (
              <Pill key={c} on={tag === c} onClick={() => onTag(tag === c ? "all" : c)}>
                {T[c]}
              </Pill>
            ))}
          </Section>

          <Section title={L.price}>
            <Pill on={under10} onClick={() => onUnder10(!under10)}>
              {L.under10}
            </Pill>
            <Pill on={late} onClick={() => onLate(!late)}>
              {L.late}
            </Pill>
          </Section>

          <Section title={L.type}>
            <Pill on={category === "all"} onClick={() => onCategory("all")}>
              {L.allTypes}
            </Pill>
            {CATEGORIES.map((c) => (
              <Pill key={c} on={category === c} onClick={() => onCategory(category === c ? "all" : c)}>
                {CATEGORY_LABELS[lang][c]}
              </Pill>
            ))}
            <Link href={`/${regionSlug}/monthly`} className={`${pill} ${pillOff}`}>
              {L.monthly}
            </Link>
          </Section>

          {cities.length > 0 && (
            <Section title={L.area}>
              <Pill on={city === "all"} onClick={() => onCity("all")}>
                {L.allAreas}
              </Pill>
              {cities.map((c) => (
                <Pill key={c} on={city === c} onClick={() => onCity(city === c ? "all" : c)}>
                  {c}
                </Pill>
              ))}
            </Section>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClearAll} className="text-sm text-muted-2 underline hover:text-foreground">
            {L.clearAll}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="press-pill ml-auto rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-dim"
          >
            {L.show(placeCount)}
          </button>
        </div>
      </div>
    </div>
  );
}
