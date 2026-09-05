"use client";

import { useMemo, useState } from "react";
import type { EventWithVenue } from "@/lib/events-data";
import type { EventType } from "@/db/schema";
import { todayDowPacific, dowFullName } from "@/lib/time";
import { DayTabs } from "./DayTabs";
import { EventTypeFilter } from "./EventTypeFilter";
import { EventCard } from "./EventCard";

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
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedType, setSelectedType] = useState<EventType | "all">("all");

  const filtered = useMemo(() => {
    return recurring
      .filter((e) => e.dayOfWeek === selectedDay)
      .filter((e) => selectedType === "all" || e.eventType === selectedType)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [recurring, selectedDay, selectedType]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <DayTabs selected={selectedDay} today={today} onSelect={setSelectedDay} />
        <EventTypeFilter selected={selectedType} onSelect={setSelectedType} />

        <p className="text-sm text-muted">
          {dowFullName(selectedDay)}
          {selectedDay === today ? " (today)" : ""} · {filtered.length} event
          {filtered.length === 1 ? "" : "s"}
        </p>

        {filtered.length === 0 ? (
          <p className="text-muted-2 text-sm py-8 text-center">
            No recurring events found for this day/type yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-2xl text-foreground">One-Off & Upcoming</h2>
            <p className="text-sm text-muted">Specific dates, not weekly recurring.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
