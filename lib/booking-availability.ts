import { db, bookings, venues } from "@/db";
import type * as schema from "@/db/schema";
import type { BookingProductType, SpecialCategory, EventType, SponsorCategoryKind } from "@/db/schema";
import { and, eq, gt, inArray, or } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

// Accepts either the plain `db` handle or the `tx` passed into a
// `db.transaction(async (tx) => ...)` callback -- both `PostgresJsDatabase<schema>` and
// `PgTransaction<...>` extend this common base, so a caller running inside a transaction
// (e.g. the checkout route's advisory-lock block) can pass `tx` here and this function
// sees the same locked snapshot as the insert that follows it, instead of a separate
// out-of-transaction connection.
export type BookingDbExecutor = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

export interface OccupyingRange {
  startDate: string;
  endDate: string;
}

// Two inclusive [start, end] date ranges, as "YYYY-MM-DD" strings -- ISO dates sort
// lexically the same as numerically, so plain string comparison is correct here.
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

// Pure decision, no DB access -- this is what's unit tested directly. `existing` is
// every other booking that currently occupies the same product/category, already
// fetched by the caller. capCount === null means uncapped (always available).
export function isRangeAvailable(
  existing: OccupyingRange[],
  requestedStart: string,
  requestedEnd: string,
  capCount: number | null
): boolean {
  if (capCount === null) return true;
  const overlapping = existing.filter((b) =>
    rangesOverlap(b.startDate, b.endDate, requestedStart, requestedEnd)
  );
  return overlapping.length < capCount;
}

const OCCUPYING_STATUSES = ["approved", "pending_approval"] as const;

// Every booking that currently counts against capacity for this productType/category
// *within one region*: approved, pending_approval, or a still-live checkout hold
// (pending_payment with reservedUntil in the future -- an expired hold is filtered out
// here, not by any cleanup job). `executor` is `db` for the read-only courtesy check, or
// a transaction (`tx` from `db.transaction(async (tx) => ...)`) when called from the
// checkout path so it sees the same locked snapshot as the insert that follows it.
//
// Scoped by joining through venues.regionId (every capped product -- "featured" and
// "category_sponsor" -- always sets bookings.venueId to the sponsoring venue itself, per
// its comment on the bookings table) rather than adding a redundant regionId column to
// bookings. Caps are meant to be a per-region slot count (4 featured placements *per
// region*, 1 sponsor *per category per region*), not one shared pool across every region
// on the platform -- without this join, one region selling out a cap would make that
// product unavailable everywhere else too.
export async function getOccupyingBookings(
  executor: BookingDbExecutor,
  productType: BookingProductType,
  category: SpecialCategory | EventType | null,
  // Only meaningful when category is non-null -- disambiguates "other" (which exists
  // in both SpecialCategory and EventType) so a special-category sponsorship and an
  // event-type sponsorship never compete for the same cap slot.
  categoryKind: SponsorCategoryKind | null,
  regionId: number,
  excludeId?: number
): Promise<OccupyingRange[]> {
  const rows = await executor
    .select({ id: bookings.id, startDate: bookings.startDate, endDate: bookings.endDate })
    .from(bookings)
    .innerJoin(venues, eq(venues.id, bookings.venueId))
    .where(
      and(
        eq(bookings.productType, productType),
        eq(venues.regionId, regionId),
        category !== null ? eq(bookings.category, category) : undefined,
        categoryKind !== null ? eq(bookings.categoryKind, categoryKind) : undefined,
        or(
          inArray(bookings.status, OCCUPYING_STATUSES),
          and(eq(bookings.status, "pending_payment"), gt(bookings.reservedUntil, new Date()))
        )
      )
    );
  return rows.filter((r) => r.id !== excludeId).map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
}

export async function checkAvailability(
  executor: BookingDbExecutor,
  productType: BookingProductType,
  category: SpecialCategory | EventType | null,
  categoryKind: SponsorCategoryKind | null,
  capCount: number | null,
  regionId: number,
  startDate: string,
  endDate: string,
  excludeId?: number
): Promise<boolean> {
  if (capCount === null) return true;
  const occupying = await getOccupyingBookings(executor, productType, category, categoryKind, regionId, excludeId);
  return isRangeAvailable(occupying, startDate, endDate, capCount);
}
