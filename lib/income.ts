import { and, eq, gte, lt } from "drizzle-orm";
import { db, payments } from "@/db";
import { pacificDayBounds, summarizeDayIncome, type DayIncome } from "@/lib/income-core";

export type { DayIncome, KindTotal, IncomeKind } from "@/lib/income-core";

// Income for one Pacific calendar day, computed only from the payments table (no Stripe
// API, no bookings, no credit ledger). `pacificDay` is YYYY-MM-DD in America/Vancouver.
// Test-mode rows are excluded. See lib/income-core.ts for the rules and the return shape.
export async function getIncomeForDay(pacificDay: string): Promise<DayIncome> {
  const { start, end } = pacificDayBounds(pacificDay);
  const rows = await db
    .select({
      kind: payments.kind,
      amountCents: payments.amountCents,
      currency: payments.currency,
      stripeFeeCents: payments.stripeFeeCents,
      taxCents: payments.taxCents,
      livemode: payments.livemode,
    })
    .from(payments)
    .where(and(gte(payments.paidAt, start), lt(payments.paidAt, end), eq(payments.livemode, true)));
  return summarizeDayIncome(pacificDay, rows);
}
