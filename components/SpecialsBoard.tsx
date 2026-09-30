"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { SpecialWithVenue } from "@/lib/data";
import type { SpecialCategory } from "@/db/schema";
import type { CategorySponsor } from "@/lib/sponsored-data";
import { todayDowInRegion, dowFullName, regionTodayISODate } from "@/lib/time";
import { CATEGORY_LABELS, t, type Language } from "@/lib/i18n";
import { DayTabs } from "./DayTabs";
import { CategoryFilter } from "./CategoryFilter";
import { CityFilter } from "./CityFilter";
import { SpecialVenueGroup } from "./SpecialVenueGroup";
import { groupByVenue } from "@/lib/group-by-venue";
import { isPromotionActive } from "@/lib/promotion";

// Leaflet reads `window`/`document` at module load, so it can never run during
// Next.js's server render -- ssr:false defers loading the whole map bundle
// (and Leaflet itself) to the browser, after this component has already
// mounted with the list view. A loading fallback keeps the toggle from
// flashing empty space while that chunk downloads.
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <p className="text-muted-2 text-sm py-8 text-center">Loading map…</p>,
});

function timeToMinutes(time: string | null): number {
  if (!time) return Number.MAX_SAFE_INTEGER; // no start time sorts last within its day
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Deterministic per-(day, venue) pseudo-random value in [0, 1) -- same venue
// gets the same value all day (no flicker on refresh), a different value
// tomorrow (no venue permanently owns a position). Replaces "earliest special
// start time" as the tiebreaker among unpaid, unboosted venues: that old
// tiebreaker never changes for a given venue, so a venue with an 11am special
// ranked above one starting at 3pm every single day forever -- a real, free,
// permanent advantage that undercut the whole point of paying for Featured.
function dailyRandom(venueId: number, dateStr: string): number {
  const str = `${dateStr}:${venueId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) / 0xffffffff;
}

export function SpecialsBoard({
  specials,
  categorySponsors = [],
  timezone,
  regionSlug,
  lang = "en",
  initialDay,
  initialCategory,
  regionLat = null,
  regionLng = null,
}: {
  specials: SpecialWithVenue[];
  categorySponsors?: CategorySponsor[];
  timezone: string;
  regionSlug: string;
  lang?: Language;
  // Locks the board to a specific day (0=Sun..6=Sat) instead of defaulting to
  // "today" -- used by the /[region]/[day] SEO landing pages (e.g. /kelowna/
  // saturday) so the day that page is about is what's server-rendered in the
  // initial HTML for crawlers, not whatever day it happens to be when Google
  // fetches it. Home page rendering (no initialDay) is unchanged.
  initialDay?: number;
  // Same idea as initialDay, for the /[region]/[slug] category SEO landing
  // pages (e.g. /kelowna/wing-night). Unlike initialDay this has no "today"
  // to drift from, so it just seeds the filter -- the visitor can still
  // switch categories freely from there.
  initialCategory?: SpecialCategory;
  // Map view's initial center -- the region's own lat/lng, not derived from
  // venue pins, so the map is centered sensibly even before/without any pins
  // in view (e.g. a filter that matches zero venues in one corner of town).
  regionLat?: number | null;
  regionLng?: number | null;
}) {
  const tr = t(lang);
  // The page is served from an ISR cache that can be an evening old, so the day baked
  // into the HTML is routinely yesterday. Render the baked value first (no hydration
  // mismatch), then correct it on mount and whenever the tab is refocused, so a tab
  // left open overnight rolls itself over to the right day.
  const initialToday = useMemo(() => todayDowInRegion(timezone), [timezone]);
  const [today, setToday] = useState(initialToday);
  const [selectedDay, setSelectedDay] = useState(initialDay ?? initialToday);
  const [selectedCategory, setSelectedCategory] = useState<SpecialCategory | "all">(
    initialCategory ?? "all"
  );
  const [selectedCity, setSelectedCity] = useState<string | "all">("all");
  const [venueQuery, setVenueQuery] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  // A fixed initialDay counts as a deliberate pick from the start -- otherwise the
  // today-sync effect below would immediately snap a /kelowna/saturday visitor's
  // view back to whatever day it actually is, defeating the point of the page.
  const dayPickedByUser = useRef(initialDay !== undefined);

  // Derived from this region's own specials rather than a hardcoded list --
  // a static city list would be wrong for every region but the one it was
  // written for.
  const cities = useMemo(
    () =>
      Array.from(new Set(specials.map((s) => s.venueCity).filter((c): c is string => !!c))).sort(),
    [specials]
  );

  useEffect(() => {
    function syncToday() {
      const actual = todayDowInRegion(timezone);
      setToday(actual);
      // Only follow the clock while the visitor is still on the default view --
      // yanking them off a day they deliberately picked would be worse than stale.
      if (!dayPickedByUser.current) setSelectedDay(actual);
    }
    syncToday();
    document.addEventListener("visibilitychange", syncToday);
    return () => document.removeEventListener("visibilitychange", syncToday);
  }, [timezone]);

  function handleSelectDay(day: number) {
    dayPickedByUser.current = true;
    setSelectedDay(day);
  }

  const normalizedQuery = venueQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    return specials
      .filter((s) => !s.isMonthly)
      .filter((s) => s.dayOfWeek === null || s.dayOfWeek === selectedDay)
      .filter((s) => selectedCategory === "all" || s.category === selectedCategory)
      .filter((s) => selectedCity === "all" || s.venueCity === selectedCity)
      .filter((s) => !normalizedQuery || s.venueName.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        // A paid seasonal boost outranks everything else while it's active.
        const boostDiff =
          Number(isPromotionActive(b.boostedUntil)) - Number(isPromotionActive(a.boostedUntil));
        if (boostDiff !== 0) return boostDiff;

        const freshnessDiff =
          b.lastVerifiedAt.getTime() - a.lastVerifiedAt.getTime();
        // group by "fresh enough" bucket first (within 14 days) so a slightly
        // older-but-still-fresh entry doesn't get buried by seconds-level diffs,
        // then order by start time within that.
        const aBucket = Math.floor(
          (Date.now() - a.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24 * 14)
        );
        const bBucket = Math.floor(
          (Date.now() - b.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24 * 14)
        );
        if (aBucket !== bBucket) return aBucket - bBucket;
        const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return freshnessDiff;
      });
  }, [specials, selectedDay, selectedCategory, selectedCity, normalizedQuery]);

  const grouped = useMemo(() => {
    const groups = groupByVenue(filtered);
    const today = regionTodayISODate(timezone);
    // Flash deals jump ahead of even paid Featured -- unlike Featured/Boost, this
    // is unpaid, but a flash special is self-limiting (expires in minutes/hours by
    // design, see db/schema.ts's flashExpiresAt), so it never becomes a standing
    // free alternative to paying for placement, just a brief, genuinely more
    // urgent thing while it's live. Then paid Featured (guaranteed placement, in
    // its existing order), then paid Boost, then everyone else shuffled by a
    // stable daily random value so no unpaid venue can count on a permanent
    // position (see dailyRandom's comment for why this replaced start-time
    // ordering).
    const flash = groups.filter((g) => g.items.some((s) => s.flashExpiresAt !== null));
    const notFlash = groups.filter((g) => !g.items.some((s) => s.flashExpiresAt !== null));
    const featured = notFlash.filter((g) => isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
    const notFeatured = notFlash.filter((g) => !isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
    const boosted = notFeatured.filter((g) => g.items.some((s) => isPromotionActive(s.boostedUntil)));
    const plain = notFeatured
      .filter((g) => !g.items.some((s) => isPromotionActive(s.boostedUntil)))
      .slice()
      .sort((a, b) => dailyRandom(a.venueId ?? 0, today) - dailyRandom(b.venueId ?? 0, today));
    return { flash, featured, boosted, plain, all: [...flash, ...featured, ...boosted, ...plain] };
  }, [filtered]);

  const activeSponsor =
    selectedCategory !== "all" ? categorySponsors.find((s) => s.category === selectedCategory) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <DayTabs selected={selectedDay} today={today} onSelect={handleSelectDay} lang={lang} />

      <div className="relative">
        <input
          type="text"
          value={venueQuery}
          onChange={(e) => setVenueQuery(e.target.value)}
          placeholder={tr.filters.searchPlaceholder}
          aria-label={tr.filters.searchAriaLabel}
          className="w-full sm:w-64 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
        />
        {venueQuery && (
          <button
            type="button"
            onClick={() => setVenueQuery("")}
            aria-label={tr.filters.clearSearchAriaLabel}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-sm"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <CategoryFilter
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          lang={lang}
          regionSlug={regionSlug}
        />
        {cities.length > 0 && (
          <CityFilter cities={cities} selected={selectedCity} onSelect={setSelectedCity} lang={lang} />
        )}
      </div>

      {activeSponsor && (
        <p className="-mt-2 text-xs text-muted-2">
          {CATEGORY_LABELS[lang][activeSponsor.category]} presented by{" "}
          {activeSponsor.sponsorUrl ? (
            <a href={activeSponsor.sponsorUrl} target="_blank" rel="noopener noreferrer" className="text-accent-dim underline">
              {activeSponsor.sponsorName}
            </a>
          ) : (
            <span className="font-medium text-foreground/80">{activeSponsor.sponsorName}</span>
          )}
        </p>
      )}

      <p className="text-sm text-muted flex items-center justify-between gap-3 flex-wrap">
        <span>
          {dowFullName(selectedDay, lang)}
          {selectedDay === today ? tr.card.todaySuffix : ""} · {filtered.length} special
          {filtered.length === 1 ? "" : "s"} at {grouped.all.length} place
          {grouped.all.length === 1 ? "" : "s"}
          {selectedCity !== "all" ? ` in ${selectedCity}` : ""}
        </span>
        {/* A condensed nudge here so the tip jar isn't only reachable by
            scrolling past the entire feed -- the full ask still lives at
            the bottom for anyone who reads that far. */}
        <a href="#tip-jar" className="text-xs text-accent-dim hover:underline shrink-0">
          {tr.tip.nudge}
        </a>
      </p>

      {/* List/Map toggle -- defaults to List (unchanged existing behaviour) so
          nothing about the page visitors already use changes unless they opt in. */}
      <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs self-start">
        {(["list", "map"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`press-pill rounded-full px-3 py-1 capitalize ${
              view === v ? "bg-accent text-background" : "text-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "map" && (
        <MapView
          specials={filtered}
          regionSlug={regionSlug}
          lang={lang}
          regionLat={regionLat}
          regionLng={regionLng}
          selectedDay={selectedDay}
          selectedCategory={selectedCategory}
          allowedLayers={["specials"]}
        />
      )}

      {view === "list" && (grouped.all.length === 0 ? (
        <p className="text-muted-2 text-sm py-8 text-center">
          {normalizedQuery
            ? tr.emptyState.noSpecialsSearch(venueQuery.trim())
            : tr.emptyState.noSpecials}
        </p>
      ) : (
        <>
          {grouped.flash.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-danger">
                Flash deals — happening now
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                {grouped.flash.map((g) => (
                  <SpecialVenueGroup
                    key={g.key}
                    venueId={g.venueId!}
                    venueName={g.venueName}
                    specials={g.items}
                    regionSlug={regionSlug}
                    lang={lang}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.featured.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                ⭐ Featured
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                {grouped.featured.map((g) => (
                  <SpecialVenueGroup
                    key={g.key}
                    venueId={g.venueId!}
                    venueName={g.venueName}
                    specials={g.items}
                    regionSlug={regionSlug}
                    lang={lang}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.boosted.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
                Trending today
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                {grouped.boosted.map((g) => (
                  <SpecialVenueGroup
                    key={g.key}
                    venueId={g.venueId!}
                    venueName={g.venueName}
                    specials={g.items}
                    regionSlug={regionSlug}
                    lang={lang}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.plain.length > 0 && (
            <section className="flex flex-col gap-3">
              {(grouped.flash.length > 0 || grouped.featured.length > 0 || grouped.boosted.length > 0) && (
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
                  All specials
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                {grouped.plain.map((g) => (
                  <SpecialVenueGroup
                    key={g.key}
                    venueId={g.venueId!}
                    venueName={g.venueName}
                    specials={g.items}
                    regionSlug={regionSlug}
                    lang={lang}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ))}
    </div>
  );
}
