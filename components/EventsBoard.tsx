"use client";

import { useMemo, useState } from "react";
import type { EventWithVenue } from "@/lib/events-data";
import type { EventType } from "@/db/schema";
import { todayDowPacific, dowFullName } from "@/lib/time";
import { DayTabs } from "./DayTabs";
import { EventTypeFilter } from "./EventTypeFilter";
import { EventVenueGroup } from "./EventVenueGroup";
import { groupByVenue } from "@/lib/group-by-venue";

const WEEKEND_DAYS = [5, 6, 0]; // Fri, Sat, Sun

function timeToMinutes(time: string | null): number {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function EventsBoard({
  recurring,
  upcoming,
}: {
  recurring: EventWithVenue[];
  upcoming: EventWithVenue[];
}) {
  const today = useMemo(() => todayDowPacific(), []);
  const [selectedDay, setSelectedDay] = useState<number | "weekend">(today);
  const [selectedType, setSelectedType] = useState<EventType | "all">("all");

  const activeDays = selectedDay === "weekend" ? WEEKEND_DAYS : [selectedDay];

  const filtered = useMemo(() => {
    return recurring
      .filter((e) => activeDays.includes(e.dayOfWeek ?? -1))
      .filter((e) => selectedType === "all" || e.eventType === selectedType)
      .sort((a, b) => {
        const dayDiff = activeDays.indexOf(a.dayOfWeek ?? -1) - activeDays.indexOf(b.dayOfWeek ?? -1);
        if (dayDiff !== 0) return dayDiff;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, selectedDay, selectedType]);

  const groupedRecurring = useMemo(() => groupByVenue(filtered), [filtered]);
  const groupedUpcoming = useMemo(() => groupByVenue(upcoming), [upcoming]);

  const label =
    selectedDay === "weekend" ? "This Weekend" : dowFullName(selectedDay) + (selectedDay === today ? " (today)" : "");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDay("weekend")}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-mono-tabular border transition-colors ${
              selectedDay === "weekend"
                ? "bg-accent text-background border-accent"
                : "bg-transparent text-muted border-border hover:border-muted"
            }`}
          >
            This Weekend
          </button>
          <DayTabs
            selected={selectedDay === "weekend" ? -1 : selectedDay}
            today={today}
            onSelect={setSelectedDay}
          />
        </div>
        <EventTypeFilter selected={selectedType} onSelect={setSelectedType} />

        <p className="text-sm text-muted">
          {label} · {filtered.length} event
          {filtered.length === 1 ? "" : "s"} at {groupedRecurring.length} place
          {groupedRecurring.length === 1 ? "" : "s"}
        </p>

        {groupedRecurring.length === 0 ? (
          <p className="text-muted-2 text-sm py-8 text-center">
            No recurring events found for this day/type yet.
          </p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
            {groupedRecurring.map((g) => (
              <EventVenueGroup
                key={g.venueId}
                venueId={g.venueId}
                venueName={g.venueName}
                events={g.items}
              />
            ))}
          </div>
        )}
      </div>

      {groupedUpcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-2xl text-foreground">One-Off & Upcoming</h2>
            <p className="text-sm text-muted">Specific dates, not weekly recurring.</p>
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
            {groupedUpcoming.map((g) => (
              <EventVenueGroup
                key={g.venueId}
                venueId={g.venueId}
                venueName={g.venueName}
                events={g.items}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
