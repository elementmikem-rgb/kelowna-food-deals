import type { BookingProductType } from "@/db/schema";

// Pure revenue aggregation for the admin revenue page, built on the payments table so it
// follows the same rules as getIncomeForDay (lib/income-core.ts): only live, CAD, real
// cash events count; credits (free trial, bundle bonus, credits spent on a booking) never
// appear because they never create a payments row.

export interface RevenuePaymentRow {
  id: number;
  kind: "tip" | "booking" | "credit_bundle" | "renewal" | "refund";
  amountCents: number;
  currency: string;
  stripeFeeCents: number | null;
  taxCents: number;
  livemode: boolean;
  paidAt: Date;
  venueId: number | null;
  bookingIds: string | null;
}

export interface BookingInfo {
  id: number;
  productType: BookingProductType;
  venueName: string | null;
  specialTitle: string | null;
  priceCents: number;
}

export interface BookingRevenueRecord {
  id: number; // booking id
  paymentId: number;
  productType: BookingProductType;
  venueName: string | null;
  specialTitle: string | null;
  priceCents: number; // this booking's share of the payment
  paidAt: Date;
}

type Totals = { totalCents: number; count: number };

export interface RevenueSummary {
  // Cash received minus refunds (before Stripe fees). Credit-bundle cash is included but
  // reported on its own line (creditBundles) because it is prepaid.
  totalCents: number;
  tips: Totals;
  creditBundles: Totals;
  renewals: Totals;
  refunds: Totals;
  stripeFeesCents: number;
  bookings: {
    totalCents: number;
    count: number;
    byProduct: Record<BookingProductType, Totals>;
    records: BookingRevenueRecord[];
  };
}

function emptyByProduct(): Record<BookingProductType, Totals> {
  return {
    featured: { totalCents: 0, count: 0 },
    boost: { totalCents: 0, count: 0 },
    category_sponsor: { totalCents: 0, count: 0 },
    // chat_term_sponsor never goes through Stripe checkout (admin-manual only).
    chat_term_sponsor: { totalCents: 0, count: 0 },
    map_pin: { totalCents: 0, count: 0 },
  };
}

// Splits one payment across the bookings it paid for in proportion to each booking's own
// price, using largest-remainder so the shares always add up to the payment exactly.
function allocate(amountCents: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (total <= 0) {
    const base = Math.floor(amountCents / weights.length);
    const out = weights.map(() => base);
    out[0]! += amountCents - base * weights.length;
    return out;
  }
  const raw = weights.map((w) => (amountCents * w) / total);
  const out = raw.map(Math.floor);
  let remainder = amountCents - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i]! += 1;
    remainder -= 1;
  }
  return out;
}

// regionIds scopes only the caller's row query; here it decides whether tips fold into
// totalCents. Tips carry no region, so under any specific scope adding them would inflate
// a scoped total with every other region's tips.
export function buildRevenueSummary(
  rows: RevenuePaymentRow[],
  bookingInfo: Map<number, BookingInfo>,
  regionIds: number[] | "all"
): RevenueSummary {
  const seen = new Set<number>();
  const byProduct = emptyByProduct();
  const records: BookingRevenueRecord[] = [];
  const tips: Totals = { totalCents: 0, count: 0 };
  const creditBundles: Totals = { totalCents: 0, count: 0 };
  const renewals: Totals = { totalCents: 0, count: 0 };
  const refunds: Totals = { totalCents: 0, count: 0 };
  const bookingPayments: Totals = { totalCents: 0, count: 0 };
  let stripeFeesCents = 0;

  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    if (!r.livemode || r.currency.toLowerCase() !== "cad") continue;

    if (r.kind === "refund") {
      refunds.totalCents += Math.abs(r.amountCents);
      refunds.count += 1;
      continue;
    }

    stripeFeesCents += r.stripeFeeCents ?? 0;

    if (r.kind === "tip") {
      tips.totalCents += r.amountCents;
      tips.count += 1;
    } else if (r.kind === "credit_bundle") {
      creditBundles.totalCents += r.amountCents;
      creditBundles.count += 1;
    } else {
      // booking or renewal
      if (r.kind === "renewal") {
        renewals.totalCents += r.amountCents;
        renewals.count += 1;
      } else {
        bookingPayments.totalCents += r.amountCents;
        bookingPayments.count += 1;
      }
      const ids = (r.bookingIds ?? "").split(",").map(Number).filter(Number.isInteger);
      const infos = ids.map((id) => bookingInfo.get(id)).filter((b): b is BookingInfo => Boolean(b));
      const shares = allocate(r.amountCents, infos.map((b) => b.priceCents));
      infos.forEach((b, i) => {
        byProduct[b.productType].totalCents += shares[i]!;
        byProduct[b.productType].count += 1;
        records.push({
          id: b.id,
          paymentId: r.id,
          productType: b.productType,
          venueName: b.venueName,
          specialTitle: b.specialTitle,
          priceCents: shares[i]!,
          paidAt: r.paidAt,
        });
      });
    }
  }

  records.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());

  const sponsorshipCents = bookingPayments.totalCents + renewals.totalCents;
  const sponsorshipCount = bookingPayments.count + renewals.count;
  const scopedTotal = sponsorshipCents + creditBundles.totalCents - refunds.totalCents;
  const totalCents = regionIds === "all" ? scopedTotal + tips.totalCents : scopedTotal;

  return {
    totalCents,
    tips,
    creditBundles,
    renewals,
    refunds,
    stripeFeesCents,
    bookings: { totalCents: sponsorshipCents, count: sponsorshipCount, byProduct, records },
  };
}
