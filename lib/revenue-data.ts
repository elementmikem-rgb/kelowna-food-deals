import { db, bookings, venues, specials } from "@/db";
import { and, eq, gte, lt, inArray, sql } from "drizzle-orm";
import type { BookingProductType } from "@/db/schema";
import { getTipsInRange } from "./tips-data";

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
  };
}

export async function getRevenueInRange(from: Date, to: Date): Promise<RevenueSummary> {
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
          lt(bookings.createdAt, to)
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

  return {
    totalCents: tipsSummary.totalCents + bookingsTotalCents,
    tips: { totalCents: tipsSummary.totalCents, count: tipsSummary.count },
    bookings: {
      totalCents: bookingsTotalCents,
      count: bookingRows.length,
      byProduct,
      records: bookingRows,
    },
  };
}
