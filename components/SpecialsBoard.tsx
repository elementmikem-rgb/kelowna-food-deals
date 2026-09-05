"use client";

import { useMemo, useState } from "react";
import type { SpecialWithVenue } from "@/lib/data";
import type { SpecialCategory } from "@/db/schema";
import { todayDowPacific, dowFullName } from "@/lib/time";
import { DayTabs } from "./DayTabs";
import { CategoryFilter } from "./CategoryFilter";
import { SpecialVenueGroup } from "./SpecialVenueGroup";
import { groupByVenue } from "@/lib/group-by-venue";

function timeToMinutes(time: string | null): number {
  if (!time) return Number.MAX_SAFE_INTEGER; // no start time sorts last within its day
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function SpecialsBoard({ specials }: { specials: SpecialWithVenue[] }) {
  const today = useMemo(() => todayDowPacific(), []);
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedCategory, setSelectedCategory] = useState<SpecialCategory | "all">(
    "all"
  );

  const filtered = useMemo(() => {
    return specials
      .filter((s) => !s.isMonthly)
      .filter((s) => s.dayOfWeek === null || s.dayOfWeek === selectedDay)
      .filter((s) => selectedCategory === "all" || s.category === selectedCategory)
      .sort((a, b) => {
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
  }, [specials, selectedDay, selectedCategory]);

  const grouped = useMemo(() => groupByVenue(filtered), [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <DayTabs selected={selectedDay} today={today} onSelect={setSelectedDay} />
      <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />

      <p className="text-sm text-muted">
        {dowFullName(selectedDay)}
        {selectedDay === today ? " (today)" : ""} · {filtered.length} special
        {filtered.length === 1 ? "" : "s"} at {grouped.length} place
        {grouped.length === 1 ? "" : "s"}
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
