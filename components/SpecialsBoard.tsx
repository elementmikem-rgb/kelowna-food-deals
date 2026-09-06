"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SpecialWithVenue } from "@/lib/data";
import type { SpecialCategory } from "@/db/schema";
import type { CategorySponsor } from "@/lib/sponsored-data";
import { todayDowPacific, dowFullName } from "@/lib/time";
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

export function SpecialsBoard({
  specials,
  categorySponsors = [],
}: {
  specials: SpecialWithVenue[];
  categorySponsors?: CategorySponsor[];
}) {
  // The page is served from an ISR cache that can be an evening old, so the day baked
  // into the HTML is routinely yesterday. Render the baked value first (no hydration
  // mismatch), then correct it on mount and whenever the tab is refocused, so a tab
  // left open overnight rolls itself over to the right day.
  const initialToday = useMemo(() => todayDowPacific(), []);
  const [today, setToday] = useState(initialToday);
  const [selectedDay, setSelectedDay] = useState(initialToday);
  const [selectedCategory, setSelectedCategory] = useState<SpecialCategory | "all">(
    "all"
  );
  const [selectedCity, setSelectedCity] = useState<string | "all">("all");
  const dayPickedByUser = useRef(false);

  useEffect(() => {
    function syncToday() {
      const actual = todayDowPacific();
      setToday(actual);
      // Only follow the clock while the visitor is still on the default view --
      // yanking them off a day they deliberately picked would be worse than stale.
      if (!dayPickedByUser.current) setSelectedDay(actual);
    }
    syncToday();
    document.addEventListener("visibilitychange", syncToday);
    return () => document.removeEventListener("visibilitychange", syncToday);
  }, []);

  function handleSelectDay(day: number) {
    dayPickedByUser.current = true;
    setSelectedDay(day);
  }

  const filtered = useMemo(() => {
    return specials
      .filter((s) => !s.isMonthly)
      .filter((s) => s.dayOfWeek === null || s.dayOfWeek === selectedDay)
      .filter((s) => selectedCategory === "all" || s.category === selectedCategory)
      .filter((s) => selectedCity === "all" || (s.venueCity ?? "Kelowna") === selectedCity)
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
  }, [specials, selectedDay, selectedCategory, selectedCity]);

  const grouped = useMemo(() => {
    const groups = groupByVenue(filtered);
    // Stable partition: featured venues first, in whatever order they already
    // had, followed by everyone else in their existing order.
    const featured = groups.filter((g) => isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
    const rest = groups.filter((g) => !isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
    return [...featured, ...rest];
  }, [filtered]);

  const activeSponsor =
    selectedCategory !== "all" ? categorySponsors.find((s) => s.category === selectedCategory) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <DayTabs selected={selectedDay} today={today} onSelect={handleSelectDay} />
      <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      <CityFilter selected={selectedCity} onSelect={setSelectedCity} />

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
