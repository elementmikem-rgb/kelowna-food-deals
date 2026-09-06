import { db, bookings } from "@/db";
import type { BookingProductType, SpecialCategory } from "@/db/schema";
import { and, eq, gt, inArray, or } from "drizzle-orm";

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

// Every booking that currently counts against capacity for this productType/category:
// approved, pending_approval, or a still-live checkout hold (pending_payment with
// reservedUntil in the future -- an expired hold is filtered out here, not by any
// cleanup job). `executor` is `db` for the read-only courtesy check, or a transaction
// (`tx` from `db.transaction(async (tx) => ...)`) when called from the checkout path
// so it sees the same locked snapshot as the insert that follows it.
export async function getOccupyingBookings(
  executor: typeof db,
  productType: BookingProductType,
  category: SpecialCategory | null,
  excludeId?: number
): Promise<OccupyingRange[]> {
  const rows = await executor
    .select({ id: bookings.id, startDate: bookings.startDate, endDate: bookings.endDate })
    .from(bookings)
    .where(
      and(
        eq(bookings.productType, productType),
        category !== null ? eq(bookings.category, category) : undefined,
        or(
          inArray(bookings.status, OCCUPYING_STATUSES),
          and(eq(bookings.status, "pending_payment"), gt(bookings.reservedUntil, new Date()))
        )
      )
    );
  return rows.filter((r) => r.id !== excludeId).map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
}

export async function checkAvailability(
  executor: typeof db,
  productType: BookingProductType,
  category: SpecialCategory | null,
  capCount: number | null,
  startDate: string,
  endDate: string,
  excludeId?: number
): Promise<boolean> {
  if (capCount === null) return true;
  const occupying = await getOccupyingBookings(executor, productType, category, excludeId);
  return isRangeAvailable(occupying, startDate, endDate, capCount);
}
