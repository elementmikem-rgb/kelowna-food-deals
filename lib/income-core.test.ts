import { describe, it, expect } from "vitest";
import { summarizeDayIncome, pacificDayBounds, type IncomeRow } from "./income-core";

function row(overrides: Partial<IncomeRow> = {}): IncomeRow {
  return {
    kind: "tip",
    amountCents: 500,
    currency: "cad",
    stripeFeeCents: 45,
    taxCents: 0,
    livemode: true,
    ...overrides,
  };
}

describe("pacificDayBounds (container runs UTC)", () => {
  it("covers 00:00 to 24:00 Pacific, half open, in PDT", () => {
    const { start, end } = pacificDayBounds("2026-10-11");
    expect(start.toISOString()).toBe("2026-10-11T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-12T07:00:00.000Z");
  });

  it("covers a 25-hour fall-back day (2026-11-01)", () => {
    const { start, end } = pacificDayBounds("2026-11-01");
    expect(start.toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("covers a 23-hour spring-forward day (2026-03-08)", () => {
    const { start, end } = pacificDayBounds("2026-03-08");
    expect(start.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T07:00:00.000Z");
  });

  it("rejects a malformed day", () => {
    expect(() => pacificDayBounds("2026-13-45")).toThrow();
    expect(() => pacificDayBounds("10/11/2026")).toThrow();
    expect(() => pacificDayBounds("")).toThrow();
  });
});

describe("summarizeDayIncome (rule D)", () => {
  it("cash in = tips + bookings + credit bundles + renewals, with a breakdown by kind", () => {
    const s = summarizeDayIncome("2026-10-11", [
      row({ kind: "tip", amountCents: 500 }),
      row({ kind: "booking", amountCents: 3000 }),
      row({ kind: "credit_bundle", amountCents: 25000 }),
      row({ kind: "renewal", amountCents: 2500 }),
    ]);
    expect(s.grossCashInCents).toBe(31000);
    expect(s.byKind.tip).toEqual({ cents: 500, count: 1 });
    expect(s.byKind.booking).toEqual({ cents: 3000, count: 1 });
    expect(s.byKind.credit_bundle).toEqual({ cents: 25000, count: 1 });
    expect(s.byKind.renewal).toEqual({ cents: 2500, count: 1 });
    expect(s.salesCount).toBe(4);
  });

  it("flags credit bundles as their own prepaid line", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ kind: "credit_bundle", amountCents: 25000 }), row({ kind: "tip", amountCents: 500 })]);
    expect(s.prepaid).toEqual({ cents: 25000, count: 1 });
    expect(s.grossCashInExcludingPrepaidCents).toBe(500);
  });

  it("excludes test-mode rows entirely", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ livemode: false, amountCents: 99999 }), row({ amountCents: 500 })]);
    expect(s.grossCashInCents).toBe(500);
    expect(s.salesCount).toBe(1);
    expect(s.stripeFeesCents).toBe(45);
  });

  it("reports refunds as a positive number and nets them out of net cash", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ kind: "booking", amountCents: 3000, stripeFeeCents: 117 }), row({ kind: "refund", amountCents: -1000, stripeFeeCents: null })]);
    expect(s.refundsCents).toBe(1000);
    expect(s.refundsCount).toBe(1);
    expect(s.grossCashInCents).toBe(3000);
    expect(s.netCashCents).toBe(3000 - 1000 - 117);
    expect(s.salesCount).toBe(1);
  });

  it("sums Stripe fees and counts sales whose fee is not known yet", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ stripeFeeCents: 45 }), row({ stripeFeeCents: null }), row({ stripeFeeCents: 100 })]);
    expect(s.stripeFeesCents).toBe(145);
    expect(s.salesMissingFee).toBe(1);
  });

  it("sums tax collected", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ taxCents: 150 }), row({ taxCents: 0 }), row({ taxCents: 25 })]);
    expect(s.taxCollectedCents).toBe(175);
  });

  it("returns zeros for a day with no payments", () => {
    const s = summarizeDayIncome("2026-10-11", []);
    expect(s).toMatchObject({
      day: "2026-10-11",
      timezone: "America/Vancouver",
      currency: "CAD",
      grossCashInCents: 0,
      refundsCents: 0,
      stripeFeesCents: 0,
      taxCollectedCents: 0,
      salesCount: 0,
      netCashCents: 0,
      salesMissingFee: 0,
      otherCurrencyRowsExcluded: 0,
    });
    expect(s.byKind.tip).toEqual({ cents: 0, count: 0 });
    expect(s.prepaid).toEqual({ cents: 0, count: 0 });
  });

  it("does not silently mix currencies: non-CAD rows are excluded and counted", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ amountCents: 500 }), row({ currency: "usd", amountCents: 700 })]);
    expect(s.grossCashInCents).toBe(500);
    expect(s.otherCurrencyRowsExcluded).toBe(1);
  });

  it("is case-insensitive about the currency code", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ currency: "CAD", amountCents: 500 })]);
    expect(s.grossCashInCents).toBe(500);
  });

  it("never counts credits spent or free-trial credits: only payments rows exist as input, so a refund kind alone never creates income", () => {
    const s = summarizeDayIncome("2026-10-11", [row({ kind: "refund", amountCents: -500 })]);
    expect(s.grossCashInCents).toBe(0);
    expect(s.salesCount).toBe(0);
  });
});
