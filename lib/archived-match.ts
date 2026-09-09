import { db, specials, events } from "@/db";
import { and, eq } from "drizzle-orm";

// Identity key for "is this the same special as before" -- deliberately excludes
// id/lastVerifiedAt/confidence/extractionNotes/sourceUrl/venueConfirmedAt, which
// are bookkeeping, not identity. Mirrors cron/upsert.ts's own reconciliation key
// (kept here, shared, so cron's automated path and every manual-add path agree
// on what counts as "the same special").
export interface SpecialIdentity {
  title: string;
  description: string | null;
  priceCents: number | null;
  dayOfWeek: number | null;
  isMonthly: boolean;
  startTime: string | null;
  endTime: string | null;
  category: string;
}

export function specialIdentityKey(s: SpecialIdentity): string {
  return JSON.stringify([
    s.title,
    s.description,
    s.priceCents,
    s.dayOfWeek,
    s.isMonthly,
    s.startTime,
    s.endTime,
    s.category,
  ]);
}

export interface EventIdentity {
  title: string;
  description: string | null;
  eventType: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  coverChargeCents: number | null;
}

export function eventIdentityKey(e: EventIdentity): string {
  return JSON.stringify([
    e.title,
    e.description,
    e.eventType,
    e.dayOfWeek,
    e.specificDate,
    e.startTime,
    e.endTime,
    e.coverChargeCents,
  ]);
}

// True when this exact special was previously archived through the flagged-review
// queue for this venue -- a human judgment call (e.g. the venue told us directly
// it's wrong), not cron superseding it with a changed version. Every manual-add
// path (the public /submit form, an admin approving a queued submission) must
// check this before inserting, the same protection cron/upsert.ts's own automated
// reconciliation already has -- otherwise a fresh Facebook/Instagram sweep that
// happens to find the same stale post silently recreates what was already
// reviewed and rejected.
export async function specialMatchesArchived(
  venueId: number,
  identity: SpecialIdentity
): Promise<boolean> {
  const rows = await db
    .select({
      title: specials.title,
      description: specials.description,
      priceCents: specials.priceCents,
      dayOfWeek: specials.dayOfWeek,
      isMonthly: specials.isMonthly,
      startTime: specials.startTime,
      endTime: specials.endTime,
      category: specials.category,
    })
    .from(specials)
    .where(and(eq(specials.venueId, venueId), eq(specials.archivedManually, true)));
  const key = specialIdentityKey(identity);
  return rows.some((r) => specialIdentityKey(r) === key);
}

export async function eventMatchesArchived(
  venueId: number,
  identity: EventIdentity
): Promise<boolean> {
  const rows = await db
    .select({
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      dayOfWeek: events.dayOfWeek,
      specificDate: events.specificDate,
      startTime: events.startTime,
      endTime: events.endTime,
      coverChargeCents: events.coverChargeCents,
    })
    .from(events)
    .where(and(eq(events.venueId, venueId), eq(events.archivedManually, true)));
  const key = eventIdentityKey(identity);
  return rows.some((r) => eventIdentityKey(r) === key);
}
