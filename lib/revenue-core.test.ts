import { describe, it, expect } from "vitest";
import { buildRevenueSummary, type RevenuePaymentRow, type BookingInfo } from "./revenue-core";

function pay(o: Partial<RevenuePaymentRow>): RevenuePaymentRow {
  return {
    id: 1,
    kind: "booking",
    amountCents: 3000,
    currency: "cad",
    stripeFeeCents: 117,
    taxCents: 0,
    livemode: true,
    paidAt: new Date("2026-10-05T18:00:00Z"),
    venueId: 5,
    bookingIds: "10",
    ...o,
  };
}

const info = (m: Record<number, Partial<BookingInfo>>): Map<number, BookingInfo> =>
  new Map(
    Object.entries(m).map(([id, v]) => [
      Number(id),
      { id: Number(id), productType: "featured", venueName: "V", specialTitle: null, priceCents: 3000, ...v } as BookingInfo,
    ])
  );

describe("buildRevenueSummary (fix 3: M9 and M10)", () => {
  it("counts the REVIEW.md M9 worked example as real cash only: $250 bundle + $35 card cart, with trial credits and credit-paid bookings contributing nothing", () => {
    // Only payments rows exist as input. A $250 bundle (275 credits), a $35 card cart,
    // free-trial credits and a booking paid with credits never create payments rows,
    // so the old "$535" can no longer appear.
    const s = buildRevenueSummary(
      [pay({ id: 1, kind: "credit_bundle", amountCents: 25000, bookingIds: null, venueId: 5 }), pay({ id: 2, kind: "booking", amountCents: 3500, bookingIds: "10" })],
      info({ 10: { priceCents: 3500 } }),
      "all"
    );
    expect(s.totalCents).toBe(28500);
    expect(s.creditBundles).toEqual({ totalCents: 25000, count: 1 });
    expect(s.bookings.totalCents).toBe(3500);
  });

  it("does not count a bundle's cash as a tip (the old no-bookingId rule)", () => {
    const s = buildRevenueSummary([pay({ kind: "credit_bundle", amountCents: 25000, bookingIds: null })], info({}), "all");
    expect(s.tips).toEqual({ totalCents: 0, count: 0 });
  });

  it("includes renewals, assigned to their booking's product", () => {
    const s = buildRevenueSummary([pay({ kind: "renewal", amountCents: 2500, bookingIds: "10" })], info({ 10: { productType: "boost", priceCents: 2500 } }), "all");
    expect(s.renewals).toEqual({ totalCents: 2500, count: 1 });
    expect(s.bookings.byProduct.boost).toEqual({ totalCents: 2500, count: 1 });
  });

  it("splits a multi-booking cart payment across its bookings in proportion to price, summing exactly to the payment", () => {
    const s = buildRevenueSummary(
      [pay({ kind: "booking", amountCents: 1000, bookingIds: "10,11" })],
      info({ 10: { productType: "featured", priceCents: 600 }, 11: { productType: "boost", priceCents: 400 } }),
      "all"
    );
    expect(s.bookings.byProduct.featured.totalCents + s.bookings.byProduct.boost.totalCents).toBe(1000);
    expect(s.bookings.byProduct.featured.totalCents).toBe(600);
    expect(s.bookings.byProduct.boost.totalCents).toBe(400);
  });

  it("subtracts refunds from the total and reports them", () => {
    const s = buildRevenueSummary([pay({ amountCents: 3000 }), pay({ id: 2, kind: "refund", amountCents: -1000, bookingIds: "10" })], info({ 10: {} }), "all");
    expect(s.refunds).toEqual({ totalCents: 1000, count: 1 });
    expect(s.totalCents).toBe(2000);
  });

  it("ignores test-mode rows", () => {
    const s = buildRevenueSummary([pay({ livemode: false, amountCents: 99999 })], info({ 10: {} }), "all");
    expect(s.totalCents).toBe(0);
  });

  it("does not double count: one payment appears once even if listed twice with the same id", () => {
    const row = pay({ id: 7 });
    const s = buildRevenueSummary([row, row], info({ 10: {} }), "all");
    expect(s.bookings.count).toBe(1);
    expect(s.totalCents).toBe(3000);
  });

  it("under a region scope, leaves tips out of the total (they have no region) but still reports them", () => {
    const s = buildRevenueSummary([pay({ kind: "tip", amountCents: 500, venueId: null, bookingIds: null }), pay({ id: 2, amountCents: 3000 })], info({ 10: {} }), [5]);
    expect(s.tips.totalCents).toBe(500);
    expect(s.totalCents).toBe(3000);
  });
});
