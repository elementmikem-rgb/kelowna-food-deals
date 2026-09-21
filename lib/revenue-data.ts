import { db, bookings, venues, specials } from "@/db";
import { and, eq, gte, lt, inArray, sql } from "drizzle-orm";
import type { BookingProductType } from "@/db/schema";
import { getTipsInRange } from "./tips-data";
import { regionScopeCondition } from "@/lib/admin-region";

export interface BookingRevenueRecord {
  id: number;
  productType: BookingProductType;
  venueName: string | null;
  specialTitle: string | null;
  priceCents: number;
  createdAt: Date;
}

export interface RevenueSummary {
  totalCents: number;
  tips: { totalCents: number; count: number };
  bookings: {
    totalCents: number;
    count: number;
    byProduct: Record<BookingProductType, { totalCents: number; count: number }>;
    records: BookingRevenueRecord[];
  };
}

// A booking has captured (non-refunded) money once Stripe checkout completes --
// that happens before admin review, not after (see the webhook: it sets
// pending_approval on payment success). "rejected" always means a refund was or
// will be issued (lib/bookings-data.ts's rejectBooking), so it never counts as
// revenue even before the refund is actually processed.
const REVENUE_STATUSES = ["pending_approval", "approved"] as const;

function emptyByProduct(): Record<BookingProductType, { totalCents: number; count: number }> {
  return {
    featured: { totalCents: 0, count: 0 },
    boost: { totalCents: 0, count: 0 },
    category_sponsor: { totalCents: 0, count: 0 },
    // chat_term_sponsor never goes through this table -- no self-serve checkout for it
    // yet (see lib/region-chat.ts/app/api/admin/sponsored/term/route.ts), only the
    // admin-manual chatTermSponsors table. Zeroed here just to satisfy the exhaustive
    // Record type; revisit once/if real checkout is wired for it.
    chat_term_sponsor: { totalCents: 0, count: 0 },
  };
}

// regionIds scopes the sponsorship/booking side of revenue to a set of regions. Tips
// have no region concept at all -- they're read straight from Stripe checkout sessions
// with no venue/region metadata attached -- so tip totals are always account-wide
// regardless of the selected scope. Callers that need a genuinely combined
// cross-region total (the "All regions" admin view) pass "all".
export async function getRevenueInRange(
  from: Date,
  to: Date,
  regionIds: number[] | "all"
): Promise<RevenueSummary> {
  const [tipsSummary, bookingRows] = await Promise.all([
    getTipsInRange(from, to),
    db
      .select({
        id: bookings.id,
        productType: bookings.productType,
        venueName: venues.name,
        specialTitle: specials.title,
        priceCents: bookings.priceCents,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .leftJoin(venues, eq(bookings.venueId, venues.id))
      .leftJoin(specials, eq(bookings.specialId, specials.id))
      .where(
        and(
          inArray(bookings.status, REVENUE_STATUSES),
          gte(bookings.createdAt, from),
          lt(bookings.createdAt, to),
          regionScopeCondition(venues.regionId, regionIds)
        )
      )
      .orderBy(sql`${bookings.createdAt} desc`),
  ]);

  const byProduct = emptyByProduct();
  for (const row of bookingRows) {
    byProduct[row.productType].totalCents += row.priceCents;
    byProduct[row.productType].count += 1;
  }

  const bookingsTotalCents = bookingRows.reduce((sum, r) => sum + r.priceCents, 0);

  // Tips carry no region at all, so they can only be honestly folded into
  // totalCents when the scope is genuinely account-wide ("all"). Under any
  // specific region/province/country scope, adding them in would silently
  // inflate a scoped total with every other region's tips too -- exactly the
  // "looks scoped but isn't" bug this whole effort exists to eliminate.
  const totalCents = regionIds === "all" ? tipsSummary.totalCents + bookingsTotalCents : bookingsTotalCents;

  return {
    totalCents,
    tips: { totalCents: tipsSummary.totalCents, count: tipsSummary.count },
    bookings: {
      totalCents: bookingsTotalCents,
      count: bookingRows.length,
      byProduct,
      records: bookingRows,
    },
  };
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
