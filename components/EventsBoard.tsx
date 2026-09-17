"use client";

import { useMemo, useState } from "react";
import type { EventWithVenue } from "@/lib/events-data";
import type { EventType } from "@/db/schema";
import type { CategorySponsor } from "@/lib/sponsored-data";
import { todayDowInRegion, dowFullName } from "@/lib/time";
import { EVENT_TYPE_LABELS, t, type Language } from "@/lib/i18n";
import { isPromotionActive } from "@/lib/promotion";
import { dailyRandom } from "@/lib/daily-random";
import { DayTabs } from "./DayTabs";
import { EventTypeFilter } from "./EventTypeFilter";
import { EventVenueGroup } from "./EventVenueGroup";
import { EventsCalendar } from "./EventsCalendar";
import { groupByVenue, type VenueGroup } from "@/lib/group-by-venue";

const WEEKEND_DAYS = [5, 6, 0]; // Fri, Sat, Sun

function timeToMinutes(time: string | null): number {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Same three-tier sort as SpecialsBoard: paid Featured venues first (guaranteed
// placement), then venues with an active paid Boost on any event, then everyone else
// shuffled by a stable daily random value so no unpaid venue can count on a permanent
// position.
function sortGroups(groups: VenueGroup<EventWithVenue>[], todayKey: string): VenueGroup<EventWithVenue>[] {
  const featured = groups.filter((g) => isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
  const notFeatured = groups.filter((g) => !isPromotionActive(g.items[0]?.venueFeaturedUntil ?? null));
  const boosted = notFeatured.filter((g) => g.items.some((e) => isPromotionActive(e.boostedUntil)));
  const plain = notFeatured
    .filter((g) => !g.items.some((e) => isPromotionActive(e.boostedUntil)))
    .slice()
    .sort((a, b) => dailyRandom(a.venueId ?? 0, todayKey) - dailyRandom(b.venueId ?? 0, todayKey));
  return [...featured, ...boosted, ...plain];
}

export function EventsBoard({
  recurring,
  upcoming,
  categorySponsors = [],
  timezone,
  regionSlug,
  lang = "en",
}: {
  recurring: EventWithVenue[];
  upcoming: EventWithVenue[];
  categorySponsors?: CategorySponsor[];
  timezone: string;
  regionSlug: string;
  lang?: Language;
}) {
  const tr = t(lang);
  const today = useMemo(() => todayDowInRegion(timezone), [timezone]);
  const [selectedDay, setSelectedDay] = useState<number | "weekend">(today);
  const [selectedType, setSelectedType] = useState<EventType | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [venueQuery, setVenueQuery] = useState("");
  const normalizedQuery = venueQuery.trim().toLowerCase();

  const todayKey = useMemo(
    () => new Date().toLocaleDateString("en-CA", { timeZone: timezone }),
    [timezone]
  );
  const upcomingDates = useMemo(
    () => new Set(upcoming.map((e) => e.specificDate).filter((d): d is string => d !== null)),
    [upcoming]
  );
  const dateFilteredUpcoming = useMemo(
    () => (selectedDate ? upcoming.filter((e) => e.specificDate === selectedDate) : upcoming),
    [upcoming, selectedDate]
  );

  const activeDays = selectedDay === "weekend" ? WEEKEND_DAYS : [selectedDay];

  const filtered = useMemo(() => {
    return recurring
      .filter((e) => activeDays.includes(e.dayOfWeek ?? -1))
      .filter((e) => selectedType === "all" || e.eventType === selectedType)
      .filter((e) => !normalizedQuery || e.venueName.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const dayDiff = activeDays.indexOf(a.dayOfWeek ?? -1) - activeDays.indexOf(b.dayOfWeek ?? -1);
        if (dayDiff !== 0) return dayDiff;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, selectedDay, selectedType, normalizedQuery]);

  const searchedUpcoming = useMemo(
    () =>
      normalizedQuery
        ? dateFilteredUpcoming.filter((e) => e.venueName.toLowerCase().includes(normalizedQuery))
        : dateFilteredUpcoming,
    [dateFilteredUpcoming, normalizedQuery]
  );

  const groupedRecurring = useMemo(
    () => sortGroups(groupByVenue(filtered), todayKey),
    [filtered, todayKey]
  );
  const groupedUpcoming = useMemo(
    () => sortGroups(groupByVenue(searchedUpcoming), todayKey),
    [searchedUpcoming, todayKey]
  );

  const activeSponsor =
    selectedType !== "all"
      ? categorySponsors.find((s) => s.kind === "event" && s.category === selectedType)
      : undefined;

  const label =
    selectedDay === "weekend" ? tr.dayTabs.thisWeekend : dowFullName(selectedDay, lang) + (selectedDay === today ? " (today)" : "");

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
            {tr.dayTabs.thisWeekend}
          </button>
          <DayTabs
            selected={selectedDay === "weekend" ? -1 : selectedDay}
            today={today}
            onSelect={setSelectedDay}
            lang={lang}
          />
        </div>
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

        <EventTypeFilter selected={selectedType} onSelect={setSelectedType} lang={lang} />

        {activeSponsor && (
          <p className="-mt-2 text-xs text-muted-2">
            {EVENT_TYPE_LABELS[lang][activeSponsor.category]} presented by{" "}
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
          {label} · {filtered.length} event
          {filtered.length === 1 ? "" : "s"} at {groupedRecurring.length} place
          {groupedRecurring.length === 1 ? "" : "s"}
        </p>

        {groupedRecurring.length === 0 ? (
          <p className="text-muted-2 text-sm py-8 text-center">
            {normalizedQuery
              ? tr.emptyState.noEventsSearch(venueQuery.trim())
              : tr.emptyState.noEvents}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {groupedRecurring.map((g) => (
              <EventVenueGroup
                key={g.key}
                venueId={g.venueId}
                venueName={g.venueName}
                events={g.items}
                regionSlug={regionSlug}
                lang={lang}
              />
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

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <EventsCalendar
              eventDates={upcomingDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              todayKey={todayKey}
            />

            <div className="flex-1 w-full">
              {groupedUpcoming.length === 0 ? (
                <p className="text-muted-2 text-sm py-8 text-center">
                  {normalizedQuery
                    ? tr.emptyState.noUpcomingSearch(venueQuery.trim(), !!selectedDate)
                    : tr.emptyState.noUpcoming}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {groupedUpcoming.map((g) => (
                    <EventVenueGroup
                      key={g.key}
                      venueId={g.venueId}
                      venueName={g.venueName}
                      events={g.items}
                      regionSlug={regionSlug}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
