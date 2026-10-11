import { startOfDayPacific, addDaysISO } from "./time";

// Pure daily-income rules over rows of the `payments` table. getIncomeForDay in
// lib/income.ts fetches the rows; everything that decides what counts as income lives
// here so it can be tested without a database.

export const INCOME_TIMEZONE = "America/Vancouver";
const INCOME_CURRENCY = "cad";

export type IncomeKind = "tip" | "booking" | "credit_bundle" | "renewal";
const INCOME_KINDS: IncomeKind[] = ["tip", "booking", "credit_bundle", "renewal"];

export interface IncomeRow {
  kind: "tip" | "booking" | "credit_bundle" | "renewal" | "refund";
  amountCents: number; // signed, refunds are negative
  currency: string;
  stripeFeeCents: number | null;
  taxCents: number;
  livemode: boolean;
}

export interface KindTotal {
  cents: number;
  count: number;
}

export interface DayIncome {
  day: string; // YYYY-MM-DD, Pacific
  timezone: typeof INCOME_TIMEZONE;
  currency: "CAD";
  // Cash actually received: tips + cash-paid bookings + credit bundle purchases + renewals.
  // Includes the card processing fee that this site passes through to the buyer, because
  // that is part of what the buyer paid. The matching cost is stripeFeesCents.
  grossCashInCents: number;
  // Credit bundles are PREPAID credits: cash received now, service delivered later.
  prepaid: KindTotal;
  grossCashInExcludingPrepaidCents: number;
  // Positive number: money paid back to buyers on this day.
  refundsCents: number;
  refundsCount: number;
  stripeFeesCents: number;
  // Number of rows counted in stripeFeesCents' blind spot: sales whose fee Stripe had
  // not reported when the row was written. Non-zero means stripeFeesCents is understated.
  salesMissingFee: number;
  taxCollectedCents: number;
  salesCount: number;
  netCashCents: number; // gross - refunds - fees
  byKind: Record<IncomeKind, KindTotal>;
  otherCurrencyRowsExcluded: number;
}

// Half-open [start, end) UTC instants for one Pacific calendar day. Built from the
// existing DST-safe helper in lib/time.ts, not a fixed UTC offset, so the 23- and
// 25-hour days in March and November come out right.
export function pacificDayBounds(day: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(new Date(`${day}T00:00:00Z`).getTime())) {
    throw new Error(`pacificDayBounds: "${day}" is not a valid YYYY-MM-DD date`);
  }
  // Reject rollovers such as 2026-02-31, which Date would silently shift.
  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    throw new Error(`pacificDayBounds: "${day}" is not a real calendar date`);
  }
  return { start: startOfDayPacific(day), end: startOfDayPacific(addDaysISO(day, 1)) };
}

export function summarizeDayIncome(day: string, rows: IncomeRow[]): DayIncome {
  const byKind: Record<IncomeKind, KindTotal> = {
    tip: { cents: 0, count: 0 },
    booking: { cents: 0, count: 0 },
    credit_bundle: { cents: 0, count: 0 },
    renewal: { cents: 0, count: 0 },
  };
  let refundsCents = 0;
  let refundsCount = 0;
  let stripeFeesCents = 0;
  let salesMissingFee = 0;
  let taxCollectedCents = 0;
  let salesCount = 0;
  let otherCurrencyRowsExcluded = 0;

  for (const r of rows) {
    if (!r.livemode) continue; // test-mode money is never income
    if (r.currency.toLowerCase() !== INCOME_CURRENCY) {
      otherCurrencyRowsExcluded += 1;
      continue;
    }
    if (r.kind === "refund") {
      refundsCents += Math.abs(r.amountCents);
      refundsCount += 1;
      continue;
    }
    if (!INCOME_KINDS.includes(r.kind)) continue;
    byKind[r.kind].cents += r.amountCents;
    byKind[r.kind].count += 1;
    salesCount += 1;
    taxCollectedCents += r.taxCents;
    if (r.stripeFeeCents === null) salesMissingFee += 1;
    else stripeFeesCents += r.stripeFeeCents;
  }

  const grossCashInCents = INCOME_KINDS.reduce((sum, k) => sum + byKind[k].cents, 0);

  return {
    day,
    timezone: INCOME_TIMEZONE,
    currency: "CAD",
    grossCashInCents,
    prepaid: { ...byKind.credit_bundle },
    grossCashInExcludingPrepaidCents: grossCashInCents - byKind.credit_bundle.cents,
    refundsCents,
    refundsCount,
    stripeFeesCents,
    salesMissingFee,
    taxCollectedCents,
    salesCount,
    netCashCents: grossCashInCents - refundsCents - stripeFeesCents,
    byKind,
    otherCurrencyRowsExcluded,
  };
}
