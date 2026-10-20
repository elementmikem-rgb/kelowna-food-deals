"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export interface StripVenue {
  venueId: number;
  venueName: string;
  regionSlug: string;
  photoId: number | null;
  items: { title: string; priceCents: number | null }[];
}

type Lang = "en" | "fr";

const COPY = {
  en: {
    deal: (n: number) => (n === 1 ? "1 deal" : `${n} deals`),
    view: "View listing",
    save: (name: string) => `Save ${name}`,
    unsave: (name: string) => `Remove ${name} from saved`,
  },
  fr: {
    deal: (n: number) => (n === 1 ? "1 offre" : `${n} offres`),
    view: "Voir la fiche",
    save: (name: string) => `Sauvegarder ${name}`,
    unsave: (name: string) => `Retirer ${name} des favoris`,
  },
};

// The headline deal for a card: the cheapest priced item, or the first one when none carry a price.
export function bestDeal(items: { title: string; priceCents: number | null }[]): string | null {
  if (items.length === 0) return null;
  const priced = items.filter((i) => i.priceCents !== null);
  const pick = priced.length > 0 ? priced.reduce((a, b) => (b.priceCents! < a.priceCents! ? b : a)) : items[0]!;
  const price = formatPrice(pick.priceCents);
  return price ? `${pick.title} ${price}` : pick.title;
}

// A horizontally swipeable row of venue cards overlaid on the bottom of the map. Swiping to a
// card selects it (the map pans to it); selecting a pin on the map scrolls the strip to its card.
export function MapVenueStrip({
  venues,
  selectedId,
  selectSource,
  savedIds,
  onSelect,
  onToggleSave,
  lang = "en",
}: {
  venues: StripVenue[];
  selectedId: number | null;
  // Where the current selection came from: only a selection made on the map scrolls the strip,
  // otherwise the strip would fight the visitor's own swipe.
  selectSource: "map" | "strip" | null;
  savedIds: Set<number>;
  onSelect: (venueId: number, source: "map" | "strip") => void;
  onToggleSave: (venue: StripVenue) => void;
  lang?: Lang;
}) {
  const tr = COPY[lang];
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const ignoreScrollUntil = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cardOf(venueId: number): HTMLElement | null {
    return scrollerRef.current?.querySelector<HTMLElement>(`[data-venue-id="${venueId}"]`) ?? null;
  }

  function scrollToCard(venueId: number) {
    const scroller = scrollerRef.current;
    const card = cardOf(venueId);
    if (!scroller || !card) return;
    ignoreScrollUntil.current = Date.now() + 700;
    scroller.scrollTo({
      left: card.offsetLeft - (scroller.clientWidth - card.clientWidth) / 2,
      behavior: "smooth",
    });
  }

  // A selection made on the map brings its card into view.
  useEffect(() => {
    if (selectedId !== null && selectSource === "map") scrollToCard(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectSource]);

  // When the visitor stops swiping, whichever card sits in the middle becomes the selection.
  function handleScroll() {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (Date.now() < ignoreScrollUntil.current) return;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const middle = scroller.scrollLeft + scroller.clientWidth / 2;
      let bestId: number | null = null;
      let bestDist = Infinity;
      for (const el of Array.from(scroller.children) as HTMLElement[]) {
        const dist = Math.abs(el.offsetLeft + el.clientWidth / 2 - middle);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = Number(el.dataset.venueId);
        }
      }
      if (bestId !== null && bestId !== selectedId) onSelect(bestId, "strip");
    }, 120);
  }

  if (venues.length === 0) return null;

  return (
    // bottom-6 keeps the OpenStreetMap attribution (bottom-right of the tile layer) readable.
    <div className="absolute inset-x-0 bottom-6 z-[1000] pointer-events-none">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="relative flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 pb-1 pointer-events-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {venues.map((v) => {
          const saved = savedIds.has(v.venueId);
          const deal = bestDeal(v.items);
          const selected = v.venueId === selectedId;
          return (
            <div
              key={v.venueId}
              data-venue-id={v.venueId}
              onClick={() => {
                if (!selected) {
                  scrollToCard(v.venueId);
                  onSelect(v.venueId, "strip");
                }
              }}
              className={`snap-center shrink-0 w-[82%] sm:w-80 rounded-xl border bg-surface shadow-[0_4px_16px_rgba(42,40,24,0.22)] p-2 flex gap-2 ${
                selected ? "border-accent ring-2 ring-accent" : "border-border"
              }`}
            >
              {v.photoId !== null ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/venue-photos/${v.photoId}?w=160`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-lg object-cover shrink-0 bg-border"
                />
              ) : (
                <div
                  aria-hidden
                  className="w-20 h-20 rounded-lg shrink-0 bg-accent/15 text-accent flex items-center justify-center font-display text-2xl"
                >
                  {v.venueName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-start gap-1">
                  <strong className="flex-1 min-w-0 truncate text-sm text-foreground">{v.venueName}</strong>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(v);
                    }}
                    aria-label={saved ? tr.unsave(v.venueName) : tr.save(v.venueName)}
                    aria-pressed={saved}
                    className={`shrink-0 text-lg leading-none px-1 ${saved ? "text-[#d62839]" : "text-muted hover:text-foreground"}`}
                  >
                    {saved ? "♥" : "♡"}
                  </button>
                </div>
                {deal && <span className="text-xs text-foreground/90 line-clamp-2">{deal}</span>}
                <div className="mt-auto flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-2">{tr.deal(v.items.length)}</span>
                  <Link
                    href={`/${v.regionSlug}/venues/${v.venueId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent-dim underline"
                  >
                    {tr.view}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
