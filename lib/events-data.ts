import { db, events, venues } from "@/db";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import type { EventType } from "@/db/schema";

export interface EventWithVenue {
  id: number;
  venueId: number | null;
  venueName: string;
  locationAddress: string | null;
  title: string;
  description: string | null;
  eventType: EventType;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  coverChargeCents: number | null;
  lastVerifiedAt: Date;
  confidence: number;
  sourceUrl: string | null;
}

const recurringColumns = {
  id: events.id,
  venueId: events.venueId,
  venueName: venues.name,
  locationAddress: events.locationAddress,
  title: events.title,
  description: events.description,
  eventType: events.eventType,
  dayOfWeek: events.dayOfWeek,
  specificDate: events.specificDate,
  startTime: events.startTime,
  endTime: events.endTime,
  coverChargeCents: events.coverChargeCents,
  lastVerifiedAt: events.lastVerifiedAt,
  confidence: events.confidence,
  sourceUrl: events.sourceUrl,
};

function pacificTodayISODate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
}

export async function getRecurringEvents(): Promise<EventWithVenue[]> {
  // Recurring weekly events always belong to one of our tracked venues.
  const rows = await db
    .select(recurringColumns)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(and(eq(venues.active, true), isNull(events.archivedAt), gte(events.dayOfWeek, 0)));

  return rows as EventWithVenue[];
}

export async function getUpcomingOneOffEvents(daysAhead = 21): Promise<EventWithVenue[]> {
  const today = pacificTodayISODate();
  const until = new Date();
  until.setDate(until.getDate() + daysAhead);
  const untilStr = until.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });

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
      specificDate: events.specificDate,
      startTime: events.startTime,
      endTime: events.endTime,
      coverChargeCents: events.coverChargeCents,
      lastVerifiedAt: events.lastVerifiedAt,
      confidence: events.confidence,
      sourceUrl: events.sourceUrl,
      venueActive: venues.active,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
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
      specificDate: r.specificDate,
      startTime: r.startTime,
      endTime: r.endTime,
      coverChargeCents: r.coverChargeCents,
      lastVerifiedAt: r.lastVerifiedAt,
      confidence: r.confidence,
      sourceUrl: r.sourceUrl,
    }));
}
