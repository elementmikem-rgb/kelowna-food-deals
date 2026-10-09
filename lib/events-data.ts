import { db, events, venues } from "@/db";
import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type { EventType, MonthlyOccurrence } from "@/db/schema";
import { regionTodayISODate, toDateOrNull } from "@/lib/time";

export interface EventWithVenue {
  id: number;
  venueId: number | null;
  venueName: string;
  locationAddress: string | null;
  title: string;
  description: string | null;
  eventType: EventType;
  dayOfWeek: number | null;
  // Only meaningful alongside a non-null dayOfWeek -- see db/schema.ts's column comment.
  monthlyOccurrence: MonthlyOccurrence | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  coverChargeCents: number | null;
  lastVerifiedAt: Date;
  confidence: number;
  sourceUrl: string | null;
  venueFeaturedUntil: Date | null;
  venueClaimedAt: Date | null;
  boostedUntil: Date | null;
  // Separate, independent add-on from boostedUntil -- see db/schema.ts.
  chatBoostedUntil: Date | null;
  // See SpecialWithVenue.hasPhoto's comment in lib/data.ts -- same reasoning.
  hasPhoto: boolean;
  // Same shape/reasoning as SpecialWithVenue's confirmCount/lastConfirmedAt in
  // lib/data.ts -- events share the same deal_feedback table (kind: 'event'),
  // just never got the venue-side venueConfirmedAt verification (see the
  // deal-verification design doc's non-goals: events deferred, visitor confirms
  // only).
  confirmCount: number;
  lastConfirmedAt: Date | null;
  // "X people interested" social proof (Eventbrite-style, components/EventInterestButton.tsx)
  // -- all-time count, no rolling window (unlike confirmCount), since interest is meant to
  // accumulate over an event's whole life, not just recent activity.
  interestedCount: number;
}

const CONFIRM_COLUMNS = {
  confirmCount: sql<number>`(
    select count(*)::int from specials.deal_feedback
    where item_id = ${events.id} and kind = 'event' and feedback_type = 'confirm'
      and created_at > now() - interval '30 days'
  )`,
  lastConfirmedAt: sql<Date | null>`(
    select max(created_at) from specials.deal_feedback
    where item_id = ${events.id} and kind = 'event' and feedback_type = 'confirm'
  )`,
  interestedCount: sql<number>`(
    select count(*)::int from specials.deal_feedback
    where item_id = ${events.id} and kind = 'event' and feedback_type = 'interested'
  )`,
};

export const recurringColumns = {
  id: events.id,
  venueId: events.venueId,
  venueName: venues.name,
  locationAddress: events.locationAddress,
  title: events.title,
  description: events.description,
  eventType: events.eventType,
  dayOfWeek: events.dayOfWeek,
  monthlyOccurrence: events.monthlyOccurrence,
  specificDate: events.specificDate,
  startTime: events.startTime,
  endTime: events.endTime,
  coverChargeCents: events.coverChargeCents,
  lastVerifiedAt: events.lastVerifiedAt,
  confidence: events.confidence,
  sourceUrl: events.sourceUrl,
  venueFeaturedUntil: venues.featuredUntil,
  venueClaimedAt: venues.claimedAt,
  boostedUntil: events.boostedUntil,
  chatBoostedUntil: events.chatBoostedUntil,
  hasPhoto: sql<boolean>`${events.photoData} is not null`,
  ...CONFIRM_COLUMNS,
};

export async function getRecurringEvents(regionId: number): Promise<EventWithVenue[]> {
  // Recurring weekly events always belong to one of our tracked venues.
  // Excludes rows that also carry a specificDate -- those are one-off events
  // that happen to land on a given weekday (e.g. a Saturday concert), not a
  // weekly recurrence, and showing them here made a single-night show appear
  // to repeat every week on that day.
  const rows = await db
    .select(recurringColumns)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        eq(events.regionId, regionId),
        isNull(events.archivedAt),
        gte(events.dayOfWeek, 0),
        isNull(events.specificDate)
      )
    );

  // See lib/time.ts's toDateOrNull comment -- CONFIRM_COLUMNS' lastConfirmedAt is a
  // raw SQL subquery, so the driver hands it back as a plain string, not a real Date.
  return rows.map((r) => ({ ...r, lastConfirmedAt: toDateOrNull(r.lastConfirmedAt) })) as EventWithVenue[];
}

export async function getUpcomingOneOffEvents(
  regionId: number,
  timezone: string,
  daysAhead = 21
): Promise<EventWithVenue[]> {
  const today = regionTodayISODate(timezone);
  const until = new Date();
  until.setDate(until.getDate() + daysAhead);
  const untilStr = until.toLocaleDateString("en-CA", { timeZone: timezone });

  // One-off events may or may not belong to a tracked venue (e.g. a winery
  // hosting a concert), so this is a left join with a locationName fallback.
  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      dayOfWeek: events.dayOfWeek,
      monthlyOccurrence: events.monthlyOccurrence,
      specificDate: events.specificDate,
      startTime: events.startTime,
      endTime: events.endTime,
      coverChargeCents: events.coverChargeCents,
      lastVerifiedAt: events.lastVerifiedAt,
      confidence: events.confidence,
      sourceUrl: events.sourceUrl,
      boostedUntil: events.boostedUntil,
      chatBoostedUntil: events.chatBoostedUntil,
      hasPhoto: sql<boolean>`${events.photoData} is not null`,
      venueActive: venues.active,
      venueFeaturedUntil: venues.featuredUntil,
      venueClaimedAt: venues.claimedAt,
      ...CONFIRM_COLUMNS,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(events.regionId, regionId),
        isNull(events.archivedAt),
        gte(events.specificDate, today),
        lte(events.specificDate, untilStr)
      )
    )
    .orderBy(asc(events.specificDate));

  return rows
    .filter((r) => r.venueId === null || r.venueActive === true)
    .map((r) => ({
      id: r.id,
      venueId: r.venueId,
      venueName: r.venueName ?? r.locationName ?? "Unknown location",
      locationAddress: r.locationAddress,
      title: r.title,
      description: r.description,
      eventType: r.eventType,
      dayOfWeek: r.dayOfWeek,
      monthlyOccurrence: r.monthlyOccurrence,
      specificDate: r.specificDate,
      startTime: r.startTime,
      endTime: r.endTime,
      coverChargeCents: r.coverChargeCents,
      lastVerifiedAt: r.lastVerifiedAt,
      confidence: r.confidence,
      sourceUrl: r.sourceUrl,
      boostedUntil: r.boostedUntil,
      chatBoostedUntil: r.chatBoostedUntil,
      hasPhoto: r.hasPhoto,
      venueFeaturedUntil: r.venueId === null ? null : r.venueFeaturedUntil,
      venueClaimedAt: r.venueId === null ? null : r.venueClaimedAt,
      confirmCount: r.confirmCount,
      // See lib/time.ts's toDateOrNull comment.
      lastConfirmedAt: toDateOrNull(r.lastConfirmedAt),
      interestedCount: r.interestedCount,
    }));
}
