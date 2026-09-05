import { db, events, venues } from "@/db";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import type { EventType } from "@/db/schema";

export interface EventWithVenue {
  id: number;
  venueId: number;
  venueName: string;
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
}

const baseColumns = {
  id: events.id,
  venueId: events.venueId,
  venueName: venues.name,
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
};

function pacificTodayISODate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
}

export async function getRecurringEvents(): Promise<EventWithVenue[]> {
  const rows = await db
    .select(baseColumns)
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

  const rows = await db
    .select(baseColumns)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(venues.active, true),
        isNull(events.archivedAt),
        gte(events.specificDate, today),
        lte(events.specificDate, untilStr)
      )
    )
    .orderBy(asc(events.specificDate));

  return rows as EventWithVenue[];
}
