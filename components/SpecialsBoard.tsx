"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SpecialWithVenue } from "@/lib/data";
import type { SpecialCategory } from "@/db/schema";
import type { CategorySponsor } from "@/lib/sponsored-data";
import { todayDowInRegion, dowFullName, regionTodayISODate } from "@/lib/time";
import { CATEGORY_LABELS } from "@/lib/format";
import { DayTabs } from "./DayTabs";
import { CategoryFilter } from "./CategoryFilter";
import { CityFilter } from "./CityFilter";
import { SpecialVenueGroup } from "./SpecialVenueGroup";
import { groupByVenue } from "@/lib/group-by-venue";
import { isPromotionActive } from "@/lib/promotion";

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
  nowMs,
}: {
  specials: SpecialWithVenue[];
  categorySponsors?: CategorySponsor[];
  timezone: string;
  // Reference "now" for the freshness buckets in the sort below, taken on the server
  // so this component never reads the clock during render: an unstable read makes the
  // same inputs sort differently across re-renders, and can order the server HTML
  // differently from hydration. The buckets are 14 days wide, so any drift between
  // the server's snapshot and the moment the visitor reads the page is immaterial.
  nowMs: number;
}) {
  // The page is served from an ISR cache that can be an evening old, so the day baked
  // into the HTML is routinely yesterday. Render the baked value first (no hydration
  // mismatch), then correct it on mount and whenever the tab is refocused, so a tab
  // left open overnight rolls itself over to the right day.
  const initialToday = useMemo(() => todayDowInRegion(timezone), [timezone]);
  const [today, setToday] = useState(initialToday);
  const [selectedDay, setSelectedDay] = useState(initialToday);
  const [selectedCategory, setSelectedCategory] = useState<SpecialCategory | "all">(
    "all"
  );
  const [selectedCity, setSelectedCity] = useState<string | "all">("all");
  const dayPickedByUser = useRef(false);

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

  const filtered = useMemo(() => {
    return specials
      .filter((s) => !s.isMonthly)
      .filter((s) => s.dayOfWeek === null || s.dayOfWeek === selectedDay)
      .filter((s) => selectedCategory === "all" || s.category === selectedCategory)
      .filter((s) => selectedCity === "all" || s.venueCity === selectedCity)
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
          (nowMs - a.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24 * 14)
        );
        const bBucket = Math.floor(
          (nowMs - b.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24 * 14)
        );
        if (aBucket !== bBucket) return aBucket - bBucket;
        const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return freshnessDiff;
      });
  }, [specials, selectedDay, selectedCategory, selectedCity, nowMs]);

  const grouped = useMemo(() => {
    const groups = groupByVenue(filtered);
    const today = regionTodayISODate(timezone);
    // Three tiers: paid Featured venues first (in their existing order --
    // that's the guaranteed placement they paid for), then venues with an
    // active paid Boost on any special, then everyone else shuffled by a
    // stable daily random value so no unpaid venue can count on a permanent
    // position (see dailyRandom's comment for why this replaced start-time
    // ordering).
    const featured = groups.filter((g) => isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
    const notFeatured = groups.filter((g) => !isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
    const boosted = notFeatured.filter((g) => g.items.some((s) => isPromotionActive(s.boostedUntil)));
    const plain = notFeatured
      .filter((g) => !g.items.some((s) => isPromotionActive(s.boostedUntil)))
      .slice()
      .sort((a, b) => dailyRandom(a.venueId ?? 0, today) - dailyRandom(b.venueId ?? 0, today));
    return [...featured, ...boosted, ...plain];
  }, [filtered, timezone]);

  const activeSponsor =
    selectedCategory !== "all" ? categorySponsors.find((s) => s.category === selectedCategory) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <DayTabs selected={selectedDay} today={today} onSelect={handleSelectDay} />
      <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      {cities.length > 0 && (
        <CityFilter cities={cities} selected={selectedCity} onSelect={setSelectedCity} />
      )}

      {activeSponsor && (
        <p className="-mt-2 text-xs text-muted-2">
          {CATEGORY_LABELS[activeSponsor.category]} presented by{" "}
          {activeSponsor.sponsorUrl ? (
            <a href={activeSponsor.sponsorUrl} target="_blank" rel="noopener noreferrer" className="text-accent-dim underline">
              {activeSponsor.sponsorName}
            </a>
          ) : (
            <span className="font-medium text-foreground/80">{activeSponsor.sponsorName}</span>
          )}
        </p>
      )}

      <p className="text-sm text-muted">
        {dowFullName(selectedDay)}
        {selectedDay === today ? " (today)" : ""} · {filtered.length} special
        {filtered.length === 1 ? "" : "s"} at {grouped.length} place
        {grouped.length === 1 ? "" : "s"}
        {selectedCity !== "all" ? ` in ${selectedCity}` : ""}
      </p>

      {grouped.length === 0 ? (
        <p className="text-muted-2 text-sm py-8 text-center">
          No specials found for this day/category yet.
        </p>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
          {grouped.map((g) => (
            <SpecialVenueGroup
              key={g.key}
              venueId={g.venueId!}
              venueName={g.venueName}
              specials={g.items}
            />
          ))}
        </div>
      )}
    </div>
  );
}
