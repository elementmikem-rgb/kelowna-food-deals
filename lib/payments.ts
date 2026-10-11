import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, payments, bookings, venues, regions } from "@/db";
import { getStripe } from "@/lib/stripe";
import {
  buildRefundPaymentRow,
  buildRenewalPaymentRow,
  buildSessionPaymentRow,
  classifyCheckoutSession,
  confirmLocalOwnership,
  decideRefundRecord,
  manualRefundObjectId,
  type CheckoutSessionFacts,
  type EventFacts,
  type InvoiceFacts,
  type OriginalPaymentFacts,
  type OwnershipLookup,
  type PaymentRowInput,
  type RefundFacts,
} from "@/lib/payments-core";
import { fetchChargeFacts, fetchInvoiceChargeFacts, stripeFeeClient } from "@/lib/payments-stripe";

// Database side of the payments table. All decisions live in payments-core.ts (unit
// tested); this file only reads/writes. Everything here is idempotent: the unique index
// on stripe_object_id plus ON CONFLICT DO NOTHING means a Stripe retry, or the same
// session arriving as both completed and async_payment_succeeded, writes one row.

const ownershipLookup: OwnershipLookup = {
  regionExists: async (slug) => {
    const [r] = await db.select({ id: regions.id }).from(regions).where(eq(regions.slug, slug)).limit(1);
    return Boolean(r);
  },
  venueExists: async (id) => {
    const [v] = await db.select({ id: venues.id }).from(venues).where(eq(venues.id, id)).limit(1);
    return Boolean(v);
  },
  bookingsById: async (ids) =>
    db
      .select({ id: bookings.id, venueId: bookings.venueId, stripeSessionId: bookings.stripeSessionId })
      .from(bookings)
      .where(inArray(bookings.id, ids)),
};

async function insertPayment(row: PaymentRowInput): Promise<boolean> {
  const inserted = await db.insert(payments).values(row).onConflictDoNothing({ target: payments.stripeObjectId }).returning({ id: payments.id });
  return inserted.length > 0;
}

// checkout.session.completed / async_payment_succeeded. Records tips, bookings and credit
// bundles, and only when the money has actually arrived (payment_status "paid"; a
// delayed method fires "completed" while still "unpaid"). Returns what happened so the
// caller can log it; never throws for "not ours".
export async function recordSessionPayment(
  session: CheckoutSessionFacts,
  event: EventFacts
): Promise<"recorded" | "duplicate" | "not_paid" | "not_ours"> {
  if (session.payment_status !== "paid") return "not_paid";
  const classification = classifyCheckoutSession(session);
  if (!classification) return "not_ours";
  const owned = await confirmLocalOwnership(session.id, classification, ownershipLookup);
  if (!owned.ok) {
    console.error("payments: ignoring session that matched our metadata but not our data:", session.id, owned.reason);
    return "not_ours";
  }
  const charge = await fetchChargeFacts(stripeFeeClient(getStripe()), session.payment_intent);
  const row = buildSessionPaymentRow(session, { ...classification, venueId: owned.venueId }, event, charge);
  return (await insertPayment(row)) ? "recorded" : "duplicate";
}

// invoice.paid for a subscription renewal. The invoice is ours only if its subscription
// id is one of our bookings' (the same test the webhook already uses to extend dates).
export async function recordRenewalPayment(
  invoice: InvoiceFacts,
  subscriptionId: string | null,
  event: EventFacts
): Promise<"recorded" | "duplicate" | "ignored"> {
  if (invoice.billing_reason !== "subscription_cycle" || !subscriptionId) return "ignored";
  const ours = await db
    .select({ id: bookings.id, venueId: bookings.venueId })
    .from(bookings)
    .where(eq(bookings.stripeSubscriptionId, subscriptionId));
  if (ours.length === 0) return "ignored";
  const charge = await fetchInvoiceChargeFacts(stripeFeeClient(getStripe()), invoice.id);
  const row = buildRenewalPaymentRow(invoice, { bookingIds: ours.map((b) => b.id), venueId: ours[0]!.venueId }, event, charge);
  if (!row) return "ignored";
  return (await insertPayment(row)) ? "recorded" : "duplicate";
}

// charge.refunded. Only refunds of a payment we recorded are written, which is also what
// keeps other businesses' refunds on the shared account out.
export async function recordChargeRefunds(
  charge: { id: string; payment_intent: string | null },
  event: EventFacts
): Promise<number> {
  if (!charge.payment_intent) return 0;
  const [original] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.stripePaymentIntentId, charge.payment_intent), ne(payments.kind, "refund")))
    .limit(1);
  if (!original) return 0;

  const list = await getStripe().refunds.list({ charge: charge.id, limit: 100 });
  let written = 0;
  for (const r of list.data) {
    if (r.status !== "succeeded") continue;
    const refund: RefundFacts = { id: r.id, amount: r.amount, currency: r.currency, created: r.created };
    const facts: OriginalPaymentFacts = {
      id: original.id,
      venueId: original.venueId,
      bookingId: original.bookingId,
      bookingIds: original.bookingIds,
      stripePaymentIntentId: original.stripePaymentIntentId,
      stripeChargeId: original.stripeChargeId ?? charge.id,
      livemode: original.livemode,
      currency: original.currency,
    };
    const row = buildRefundPaymentRow(refund, facts, event);
    if (await writeRefundRow(original.id, row, false)) written += 1;
  }
  return written;
}

async function writeRefundRow(originalId: number, row: PaymentRowInput, manual: boolean): Promise<boolean> {
  const existing = await db
    .select({ stripeObjectId: payments.stripeObjectId, amountCents: payments.amountCents })
    .from(payments)
    .where(and(eq(payments.relatedPaymentId, originalId), eq(payments.kind, "refund")));
  const decision = decideRefundRecord(existing, { stripeObjectId: row.stripeObjectId, amountCents: row.amountCents, manual });
  if (decision.action === "skip") return false;
  if (decision.action === "adopt") {
    // Stripe's report of a refund an admin already recorded by hand: keep one row, now
    // carrying Stripe's id and the real refund time.
    await db
      .update(payments)
      .set({ stripeObjectId: row.stripeObjectId, stripeEventId: row.stripeEventId, paidAt: row.paidAt })
      .where(eq(payments.stripeObjectId, decision.existingObjectId));
    return true;
  }
  return insertPayment(row);
}

// Admin "mark refunded". Saves the amount and date on the booking and writes the refund
// row. Default amount is everything the buyer paid (the original payment's amount,
// including the pass-through card fee); pass amountCents for a partial refund.
// A booking with no payments row (paid before this table existed) only gets its own
// columns updated and returns recorded: false, rather than inventing an original.
export async function recordManualRefund(
  bookingId: number,
  opts: { amountCents?: number; refundedAt?: Date } = {}
): Promise<{ recorded: boolean; amountCents: number }> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) throw new Error(`booking ${bookingId} not found`);

  const refundedAt = opts.refundedAt ?? new Date();
  const [original] = booking.stripePaymentIntentId
    ? await db
        .select()
        .from(payments)
        .where(and(eq(payments.stripePaymentIntentId, booking.stripePaymentIntentId), ne(payments.kind, "refund")))
        .limit(1)
    : [];

  const amountCents = opts.amountCents ?? original?.amountCents ?? booking.priceCents;
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error(`invalid refund amount ${amountCents}`);

  await db.update(bookings).set({ refundNeeded: false, refundedCents: amountCents, refundedAt }).where(eq(bookings.id, bookingId));

  if (!original) return { recorded: false, amountCents };

  const row = buildRefundPaymentRow(
    { id: manualRefundObjectId(bookingId), amount: amountCents, currency: original.currency, created: Math.floor(refundedAt.getTime() / 1000) },
    {
      id: original.id,
      venueId: original.venueId,
      bookingId: original.bookingId ?? bookingId,
      bookingIds: original.bookingIds,
      stripePaymentIntentId: original.stripePaymentIntentId,
      stripeChargeId: original.stripeChargeId,
      livemode: original.livemode,
      currency: original.currency,
    },
    { id: "", created: Math.floor(refundedAt.getTime() / 1000), livemode: original.livemode }
  );
  row.stripeEventId = null;
  row.note = "Recorded by an admin marking the refund done";
  // Either written now, or already present because Stripe's own report got there first.
  await writeRefundRow(original.id, row, true);
  return { recorded: true, amountCents };
}

// Fills in a fee that Stripe had not reported when a row was written. Safe to run any
// time; returns how many rows it completed.
export async function fillMissingFees(limit = 200): Promise<number> {
  const rows = await db
    .select({ id: payments.id, pi: payments.stripePaymentIntentId, kind: payments.kind })
    .from(payments)
    .where(and(sql`${payments.stripeFeeCents} is null`, ne(payments.kind, "refund"), sql`${payments.stripePaymentIntentId} is not null`))
    .limit(limit);
  let filled = 0;
  const client = stripeFeeClient(getStripe());
  for (const r of rows) {
    const facts = await fetchChargeFacts(client, r.pi);
    if (facts && facts.feeCents !== null) {
      await db.update(payments).set({ stripeFeeCents: facts.feeCents, stripeChargeId: facts.chargeId, note: null }).where(eq(payments.id, r.id));
      filled += 1;
    }
  }
  return filled;
}
