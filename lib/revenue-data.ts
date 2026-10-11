import { db, bookings, venues, specials, payments } from "@/db";
import { and, eq, gte, lt, inArray, sql } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";
import { buildRevenueSummary, type BookingInfo, type RevenueSummary } from "@/lib/revenue-core";
import type { BookingProductType } from "@/db/schema";

export type { RevenueSummary, BookingRevenueRecord } from "@/lib/revenue-core";

// Revenue for the admin page, from the payments table (lib/payments.ts) using the same
// rules as getIncomeForDay: real cash only (tips, card-paid bookings, credit-bundle
// purchases, renewals) minus refunds, live mode only, by the time the money actually
// arrived (paid_at), never by booking creation time. Credits spent on a booking and
// free-trial credits are not cash and never appear (REVIEW.md M9). Renewals are recorded
// by the Stripe webhook (REVIEW.md M10).
//
// regionIds scopes rows that carry a venue (bookings, renewals, credit bundles). Tips
// have no region, so under a specific scope they are reported but left out of totalCents
// (see buildRevenueSummary).
export async function getRevenueInRange(
  from: Date,
  to: Date,
  regionIds: number[] | "all"
): Promise<RevenueSummary> {
  const rows = await db
    .select({
      id: payments.id,
      kind: payments.kind,
      amountCents: payments.amountCents,
      currency: payments.currency,
      stripeFeeCents: payments.stripeFeeCents,
      taxCents: payments.taxCents,
      livemode: payments.livemode,
      paidAt: payments.paidAt,
      venueId: payments.venueId,
      bookingIds: payments.bookingIds,
    })
    .from(payments)
    .leftJoin(venues, eq(payments.venueId, venues.id))
    .where(
      and(
        gte(payments.paidAt, from),
        lt(payments.paidAt, to),
        eq(payments.livemode, true),
        // Tips (no venue) are always fetched so they can be reported; the scope applies to
        // every row that has a venue.
        regionIds === "all"
          ? undefined
          : sql`(${payments.venueId} is null or ${regionScopeCondition(venues.regionId, regionIds)})`
      )
    );

  const ids = [...new Set(rows.flatMap((r) => (r.bookingIds ?? "").split(",").map(Number).filter(Number.isInteger)))];
  const infoRows = ids.length
    ? await db
        .select({
          id: bookings.id,
          productType: bookings.productType,
          venueName: venues.name,
          specialTitle: specials.title,
          priceCents: bookings.priceCents,
        })
        .from(bookings)
        .leftJoin(venues, eq(bookings.venueId, venues.id))
        .leftJoin(specials, eq(bookings.specialId, specials.id))
        .where(inArray(bookings.id, ids))
    : [];
  const bookingInfo = new Map<number, BookingInfo>(infoRows.map((b) => [b.id, b]));

  return buildRevenueSummary(rows, bookingInfo, regionIds);
}

export interface ActiveSubscription {
  id: number;
  productType: BookingProductType;
  venueName: string | null;
  specialTitle: string | null;
  priceCents: number;
  endDate: string;
}

// "Still recurring" isn't just status = "approved" -- a cancelled-but-not-yet-expired
// subscription (handleSubscriptionDeleted in the Stripe webhook turns autoRenew off
// but leaves the row running to its current endDate) shouldn't count toward MRR even
// though it's still technically approved and live right now, since no further charge
// is actually coming.
export async function getActiveSubscriptions(regionIds: number[] | "all"): Promise<ActiveSubscription[]> {
  return db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      venueName: venues.name,
      specialTitle: specials.title,
      priceCents: bookings.priceCents,
      endDate: bookings.endDate,
    })
    .from(bookings)
    .leftJoin(venues, eq(bookings.venueId, venues.id))
    .leftJoin(specials, eq(bookings.specialId, specials.id))
    .where(
      and(
        eq(bookings.status, "approved"),
        eq(bookings.autoRenew, true),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(sql`${bookings.endDate} asc`);
}

export async function getMRRCents(regionIds: number[] | "all"): Promise<number> {
  const rows = await getActiveSubscriptions(regionIds);
  // Every stored priceCents on an auto-renew booking already IS its monthly charge
  // (AUTO_RENEW_WINDOW_DAYS in cart-checkout/route.ts prices every auto-renew item at
  // exactly dailyRate * 30 up front) -- no per-day conversion needed here.
  return rows.reduce((sum, r) => sum + r.priceCents, 0);
}
