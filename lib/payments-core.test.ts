import { describe, it, expect } from "vitest";
import {
  classifyCheckoutSession,
  buildSessionPaymentRow,
  buildRenewalPaymentRow,
  buildRefundPaymentRow,
  decideRefundRecord,
  manualRefundObjectId,
  type CheckoutSessionFacts,
} from "./payments-core";

function session(overrides: Partial<CheckoutSessionFacts> = {}): CheckoutSessionFacts {
  return {
    id: "cs_live_1",
    mode: "payment",
    payment_status: "paid",
    payment_intent: "pi_1",
    amount_total: 1000,
    currency: "cad",
    total_details: { amount_tax: 0 },
    metadata: { type: "tip", regionSlug: "kelowna" },
    ...overrides,
  };
}

describe("classifyCheckoutSession (fix 4: only TodaysTab sessions)", () => {
  it("recognises a tip by metadata.type and a regionSlug", () => {
    expect(classifyCheckoutSession(session())).toEqual({ kind: "tip", venueId: null, bookingIds: [], regionSlug: "kelowna" });
  });

  it("does not treat a tip without a regionSlug as ours (another business's tip jar)", () => {
    expect(classifyCheckoutSession(session({ metadata: { type: "tip" } }))).toBeNull();
  });

  it("recognises a credit bundle with a venueId", () => {
    const c = classifyCheckoutSession(session({ metadata: { type: "credit_bundle", venueId: "42", credits: "275" } }));
    expect(c).toEqual({ kind: "credit_bundle", venueId: 42, bookingIds: [], regionSlug: null });
  });

  it("rejects a credit bundle with a bad venueId", () => {
    expect(classifyCheckoutSession(session({ metadata: { type: "credit_bundle", venueId: "abc" } }))).toBeNull();
  });

  it("recognises a single booking via metadata.bookingId", () => {
    const c = classifyCheckoutSession(session({ metadata: { bookingId: "7" } }));
    expect(c).toEqual({ kind: "booking", venueId: null, bookingIds: [7], regionSlug: null });
  });

  it("recognises a cart via metadata.bookingIds", () => {
    const c = classifyCheckoutSession(session({ metadata: { bookingIds: "7,8,9" } }));
    expect(c?.kind).toBe("booking");
    expect(c?.bookingIds).toEqual([7, 8, 9]);
  });

  it("ignores sessions from Photaro or Callova (no TodaysTab marker at all)", () => {
    expect(classifyCheckoutSession(session({ metadata: { orderId: "55" } }))).toBeNull();
    expect(classifyCheckoutSession(session({ metadata: null }))).toBeNull();
    expect(classifyCheckoutSession(session({ metadata: {} }))).toBeNull();
  });
});

describe("buildSessionPaymentRow (fixes 1 and 5)", () => {
  const event = { id: "evt_1", created: 1_790_000_000, livemode: true };

  it("stores the real amount charged, currency, tax, livemode and the payment time", () => {
    const c = classifyCheckoutSession(session())!;
    const row = buildSessionPaymentRow(session({ amount_total: 1030, total_details: { amount_tax: 0 } }), c, event, {
      feeCents: 62,
      chargeId: "ch_1",
      paidAt: new Date("2026-10-05T18:00:00Z"),
    });
    expect(row).toMatchObject({
      kind: "tip",
      amountCents: 1030,
      currency: "cad",
      stripeFeeCents: 62,
      taxCents: 0,
      stripeObjectId: "cs_live_1",
      stripeEventId: "evt_1",
      stripeSessionId: "cs_live_1",
      stripePaymentIntentId: "pi_1",
      stripeChargeId: "ch_1",
      livemode: true,
    });
    expect(row.paidAt).toEqual(new Date("2026-10-05T18:00:00Z"));
  });

  it("leaves the fee null when Stripe has not reported it yet, and says so", () => {
    const c = classifyCheckoutSession(session())!;
    const row = buildSessionPaymentRow(session(), c, event, null);
    expect(row.stripeFeeCents).toBeNull();
    expect(row.note).toMatch(/fee not yet available/i);
  });

  it("falls back to the event time for paid_at when no charge time is known", () => {
    const c = classifyCheckoutSession(session())!;
    const row = buildSessionPaymentRow(session(), c, event, null);
    expect(row.paidAt).toEqual(new Date(1_790_000_000 * 1000));
  });

  it("records test-mode events as livemode false", () => {
    const c = classifyCheckoutSession(session())!;
    const row = buildSessionPaymentRow(session(), c, { ...event, livemode: false }, null);
    expect(row.livemode).toBe(false);
  });

  it("captures tax collected from total_details", () => {
    const c = classifyCheckoutSession(session({ metadata: { bookingId: "7" } }))!;
    const row = buildSessionPaymentRow(session({ metadata: { bookingId: "7" }, total_details: { amount_tax: 50 } }), c, event, null);
    expect(row.taxCents).toBe(50);
  });

  it("keeps a single booking id and the full list for a cart", () => {
    const one = buildSessionPaymentRow(session({ metadata: { bookingId: "7" } }), classifyCheckoutSession(session({ metadata: { bookingId: "7" } }))!, event, null);
    expect(one.bookingId).toBe(7);
    expect(one.bookingIds).toBe("7");
    const cartSession = session({ metadata: { bookingIds: "7,8" } });
    const cart = buildSessionPaymentRow(cartSession, classifyCheckoutSession(cartSession)!, event, null);
    expect(cart.bookingId).toBeNull();
    expect(cart.bookingIds).toBe("7,8");
  });

  it("uses the same stripeObjectId for completed and async_payment_succeeded, so a retry cannot double count", () => {
    const c = classifyCheckoutSession(session())!;
    const a = buildSessionPaymentRow(session(), c, { ...event, id: "evt_A" }, null);
    const b = buildSessionPaymentRow(session(), c, { ...event, id: "evt_B" }, null);
    expect(a.stripeObjectId).toBe(b.stripeObjectId);
  });

  it("falls back to 0 for a missing amount_total", () => {
    const c = classifyCheckoutSession(session())!;
    expect(buildSessionPaymentRow(session({ amount_total: null }), c, event, null).amountCents).toBe(0);
  });
});

describe("buildRenewalPaymentRow (fix 1: invoice.paid renewals)", () => {
  const event = { id: "evt_r", created: 1_791_000_000, livemode: true };

  it("records a subscription_cycle invoice as a renewal using amount_paid", () => {
    const row = buildRenewalPaymentRow(
      { id: "in_1", amount_paid: 2500, currency: "cad", billing_reason: "subscription_cycle", paid_at: 1_791_000_100, tax: 0 },
      { bookingIds: [3, 4], venueId: 9 },
      event,
      { feeCents: 105, chargeId: "ch_r", paymentIntentId: "pi_r", paidAt: null }
    );
    expect(row).toMatchObject({
      kind: "renewal",
      amountCents: 2500,
      stripeObjectId: "in_1",
      stripeFeeCents: 105,
      stripePaymentIntentId: "pi_r",
      venueId: 9,
      bookingIds: "3,4",
      livemode: true,
    });
    expect(row!.bookingId).toBeNull();
    expect(row!.paidAt).toEqual(new Date(1_791_000_100 * 1000));
  });

  it("returns null for the first invoice, which checkout.session.completed already recorded", () => {
    expect(
      buildRenewalPaymentRow(
        { id: "in_0", amount_paid: 2500, currency: "cad", billing_reason: "subscription_create", paid_at: null, tax: 0 },
        { bookingIds: [3], venueId: 9 },
        event,
        null
      )
    ).toBeNull();
  });

  it("returns null for a zero-dollar invoice", () => {
    expect(
      buildRenewalPaymentRow(
        { id: "in_z", amount_paid: 0, currency: "cad", billing_reason: "subscription_cycle", paid_at: null, tax: 0 },
        { bookingIds: [3], venueId: 9 },
        event,
        null
      )
    ).toBeNull();
  });
});

describe("refunds (fix 2)", () => {
  const original = { id: 11, venueId: 5, bookingId: 7, bookingIds: "7", stripePaymentIntentId: "pi_1", stripeChargeId: "ch_1", livemode: true, currency: "cad" };

  it("builds a NEGATIVE row linked to the original payment, keyed by the refund id", () => {
    const row = buildRefundPaymentRow(
      { id: "re_1", amount: 700, currency: "cad", created: 1_791_100_000 },
      original,
      { id: "evt_x", created: 1_791_100_050, livemode: true }
    );
    expect(row).toMatchObject({
      kind: "refund",
      amountCents: -700,
      stripeObjectId: "re_1",
      relatedPaymentId: 11,
      bookingId: 7,
      venueId: 5,
      livemode: true,
      stripeFeeCents: null,
    });
    expect(row.paidAt).toEqual(new Date(1_791_100_000 * 1000));
  });

  it("inherits livemode from the original payment, not the event", () => {
    const row = buildRefundPaymentRow({ id: "re_2", amount: 100, currency: "cad", created: 1 }, { ...original, livemode: false }, { id: "e", created: 1, livemode: true });
    expect(row.livemode).toBe(false);
  });

  it("decideRefundRecord inserts a Stripe refund nobody has recorded yet", () => {
    expect(decideRefundRecord([], { stripeObjectId: "re_1", amountCents: -700, manual: false })).toEqual({ action: "insert" });
  });

  it("decideRefundRecord skips a Stripe refund that is already recorded (webhook retry)", () => {
    expect(decideRefundRecord([{ stripeObjectId: "re_1", amountCents: -700 }], { stripeObjectId: "re_1", amountCents: -700, manual: false })).toEqual({ action: "skip" });
  });

  it("decideRefundRecord adopts a manual row when the Stripe refund for the same amount arrives later", () => {
    const manualId = manualRefundObjectId(7);
    expect(decideRefundRecord([{ stripeObjectId: manualId, amountCents: -700 }], { stripeObjectId: "re_1", amountCents: -700, manual: false })).toEqual({
      action: "adopt",
      existingObjectId: manualId,
    });
  });

  it("decideRefundRecord inserts when the Stripe refund amount differs from the manual one", () => {
    expect(decideRefundRecord([{ stripeObjectId: manualRefundObjectId(7), amountCents: -700 }], { stripeObjectId: "re_1", amountCents: -300, manual: false })).toEqual({ action: "insert" });
  });

  it("decideRefundRecord skips a manual refund when Stripe already reported the same amount", () => {
    expect(decideRefundRecord([{ stripeObjectId: "re_1", amountCents: -700 }], { stripeObjectId: manualRefundObjectId(7), amountCents: -700, manual: true })).toEqual({ action: "skip" });
  });

  it("decideRefundRecord skips a second manual click for the same booking", () => {
    const id = manualRefundObjectId(7);
    expect(decideRefundRecord([{ stripeObjectId: id, amountCents: -700 }], { stripeObjectId: id, amountCents: -700, manual: true })).toEqual({ action: "skip" });
  });

  it("manualRefundObjectId is stable and cannot collide with a Stripe id", () => {
    expect(manualRefundObjectId(7)).toBe("manual-refund-booking-7");
  });
});
