import { creditLedger, venues } from "@/db";
import type { CreditLedgerReason } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { BookingDbExecutor } from "./booking-availability";

// 1 credit = $1 (100 cents) -- a flat, transparent dollar peg rather than a separate
// gamified currency, so a credit's "worth" is always obvious to a venue owner and
// spending reuses monetizationSettings.priceCentsPerDay directly with no second price
// list to maintain. See project_todaystab_venue_credit_system memory for the full
// design writeup.
export const CENTS_PER_CREDIT = 100;

// Granted once per venue on claim approval (see app/api/admin/claims/[id]/route.ts).
// Free trial, no expiry -- sits in the same wallet/ledger as anything purchased later.
export const FREE_TRIAL_CREDITS = 10;

export function centsToCredits(cents: number): number {
  if (!Number.isInteger(cents) || cents % CENTS_PER_CREDIT !== 0) {
    throw new Error(`centsToCredits: ${cents} isn't a whole number of credits`);
  }
  return cents / CENTS_PER_CREDIT;
}

export function creditsToCents(credits: number): number {
  return credits * CENTS_PER_CREDIT;
}

export class InsufficientCreditsError extends Error {
  constructor(venueId: number, needed: number, available: number) {
    super(`venue ${venueId} needs ${needed} credits but has ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

async function writeLedger(
  executor: BookingDbExecutor,
  venueId: number,
  delta: number,
  reason: CreditLedgerReason,
  opts: { relatedBookingId?: number; stripeSessionId?: string } = {}
): Promise<void> {
  await executor
    .update(venues)
    .set({ creditBalance: sql`${venues.creditBalance} + ${delta}` })
    .where(eq(venues.id, venueId));
  await executor.insert(creditLedger).values({
    venueId,
    delta,
    reason,
    relatedBookingId: opts.relatedBookingId ?? null,
    stripeSessionId: opts.stripeSessionId ?? null,
  });
}

// Idempotent: a venue already granted a free trial (checked via an existing
// "free_trial" ledger row, not just claimedAt, so a re-run of this function is always
// safe even if the caller's own idempotency guard is ever removed) never gets a second
// one. Called inside the same transaction as the claim-approval's claimedAt update.
export async function grantFreeTrialCredits(executor: BookingDbExecutor, venueId: number): Promise<void> {
  const [existing] = await executor
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(sql`${creditLedger.venueId} = ${venueId} AND ${creditLedger.reason} = 'free_trial'`)
    .limit(1);
  if (existing) return;
  await writeLedger(executor, venueId, FREE_TRIAL_CREDITS, "free_trial");
}

// Records a completed Stripe purchase of a credit bundle. Called from the Stripe
// webhook handler on checkout.session.completed for a credit-bundle session (see the
// "type": "credit_bundle" metadata flag used to route the webhook).
export async function grantPurchasedCredits(
  executor: BookingDbExecutor,
  venueId: number,
  credits: number,
  stripeSessionId: string
): Promise<void> {
  await writeLedger(executor, venueId, credits, "purchase", { stripeSessionId });
}

// Debits `credits` from venueId's wallet for a booking paid via the credit rail
// instead of Stripe. Must run inside the same transaction as the availability check
// and booking insert it's paying for (see app/api/owner/cart-checkout/route.ts), with
// venues row-locked first, so two concurrent requests against the same balance can't
// both succeed. Throws InsufficientCreditsError rather than silently clamping to zero
// -- the caller should roll back the whole transaction on that error.
export async function spendCredits(
  executor: BookingDbExecutor,
  venueId: number,
  credits: number,
  relatedBookingId: number
): Promise<void> {
  const [row] = await executor
    .select({ creditBalance: venues.creditBalance })
    .from(venues)
    .where(eq(venues.id, venueId))
    .for("update");
  if (!row || row.creditBalance < credits) {
    throw new InsufficientCreditsError(venueId, credits, row?.creditBalance ?? 0);
  }
  await writeLedger(executor, venueId, -credits, "spend", { relatedBookingId });
}

// Credits back a booking's spend -- called when an admin rejects a credit-paid
// booking (lib/bookings-data.ts's rejectBooking). Unlike a cash refund, this never
// needs a manual "mark refunded" step: there's no external payment processor
// involved, so crediting the venue's own internal wallet back is a same-transaction,
// fully-reversible bookkeeping fix rather than a real money movement.
export async function refundCredits(
  executor: BookingDbExecutor,
  venueId: number,
  credits: number,
  relatedBookingId: number
): Promise<void> {
  await writeLedger(executor, venueId, credits, "refund", { relatedBookingId });
}
