// Pure logic for turning Stripe events into rows of the `payments` table. No database
// or Stripe client is touched here, so every rule is unit-testable. The webhook and
// lib/payments.ts do the I/O around it.
//
// The Stripe account is shared with Photaro and Callova (see lib/tips-data.ts), so the
// first job is deciding whether a session even belongs to TodaysTab. classifyCheckoutSession
// only accepts the metadata shapes this site's own checkout routes set; anything else
// (including another business's session) returns null and is never recorded.

export const PAYMENT_KINDS = ["tip", "booking", "credit_bundle", "renewal", "refund"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export interface CheckoutSessionFacts {
  id: string;
  mode: "payment" | "subscription" | "setup";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  payment_intent: string | null;
  amount_total: number | null;
  currency: string | null;
  total_details?: { amount_tax?: number | null } | null;
  metadata: Record<string, string> | null;
}

export interface EventFacts {
  id: string;
  created: number; // unix seconds
  livemode: boolean;
}

export interface ChargeFacts {
  feeCents: number | null;
  chargeId: string | null;
  paymentIntentId?: string | null;
  paidAt: Date | null;
}

export interface PaymentRowInput {
  kind: PaymentKind;
  // Signed: money in is positive, a refund is negative.
  amountCents: number;
  currency: string;
  // Null until Stripe's balance transaction reports it (see note).
  stripeFeeCents: number | null;
  taxCents: number;
  stripeObjectId: string;
  stripeEventId: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  bookingId: number | null;
  bookingIds: string | null;
  venueId: number | null;
  relatedPaymentId: number | null;
  livemode: boolean;
  paidAt: Date;
  note: string | null;
}

export interface SessionClassification {
  kind: "tip" | "credit_bundle" | "booking";
  venueId: number | null;
  bookingIds: number[];
  regionSlug: string | null;
}

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

// Metadata shapes set by this site's own checkout routes:
//   app/api/tip/checkout/route.ts          { type: "tip", regionSlug }
//   app/api/owner/credits/checkout/route.ts { type: "credit_bundle", venueId, credits }
//   app/api/bookings/checkout/route.ts      { bookingId }
//   app/api/owner/cart-checkout/route.ts    { bookingIds: "1,2,3" }
// A tip must also carry regionSlug: metadata.type alone is not unique to this site on a
// shared Stripe account. The DB layer additionally confirms the region / venue / booking
// ids exist locally before a row is written.
export function classifyCheckoutSession(session: Pick<CheckoutSessionFacts, "metadata">): SessionClassification | null {
  const md = session.metadata;
  if (!md) return null;

  if (md.type === "tip") {
    return md.regionSlug ? { kind: "tip", venueId: null, bookingIds: [], regionSlug: md.regionSlug } : null;
  }

  if (md.type === "credit_bundle") {
    const venueId = Number(md.venueId);
    return Number.isInteger(venueId) && venueId > 0
      ? { kind: "credit_bundle", venueId, bookingIds: [], regionSlug: null }
      : null;
  }

  const ids = md.bookingIds ? parseIds(md.bookingIds) : parseIds(md.bookingId);
  if (ids.length > 0) return { kind: "booking", venueId: null, bookingIds: ids, regionSlug: null };

  return null;
}

export const FEE_PENDING_NOTE = "Stripe fee not yet available from the balance transaction when recorded";

export function buildSessionPaymentRow(
  session: CheckoutSessionFacts,
  classification: SessionClassification,
  event: EventFacts,
  charge: ChargeFacts | null
): PaymentRowInput {
  const feeKnown = charge !== null && charge.feeCents !== null;
  return {
    kind: classification.kind,
    amountCents: session.amount_total ?? 0,
    currency: (session.currency ?? "cad").toLowerCase(),
    stripeFeeCents: feeKnown ? charge!.feeCents : null,
    taxCents: session.total_details?.amount_tax ?? 0,
    // The session id is the idempotency key: checkout.session.completed and
    // checkout.session.async_payment_succeeded for one session, and any Stripe retry,
    // all produce the same key and so can only ever create one row.
    stripeObjectId: session.id,
    stripeEventId: event.id,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    stripeChargeId: charge?.chargeId ?? null,
    bookingId: classification.bookingIds.length === 1 ? classification.bookingIds[0]! : null,
    bookingIds: classification.bookingIds.length > 0 ? classification.bookingIds.join(",") : null,
    venueId: classification.venueId,
    relatedPaymentId: null,
    livemode: event.livemode,
    paidAt: charge?.paidAt ?? new Date(event.created * 1000),
    note: feeKnown ? null : FEE_PENDING_NOTE,
  };
}

export interface InvoiceFacts {
  id: string;
  amount_paid: number;
  currency: string | null;
  billing_reason: string | null;
  paid_at: number | null; // status_transitions.paid_at, unix seconds
  tax: number | null;
}

// Only "subscription_cycle" invoices are renewals. The very first invoice of a
// subscription ("subscription_create") is the same money as the checkout session that
// created it, which buildSessionPaymentRow already records, so recording it here too
// would count it twice.
export function buildRenewalPaymentRow(
  invoice: InvoiceFacts,
  owner: { bookingIds: number[]; venueId: number | null },
  event: EventFacts,
  charge: ChargeFacts | null
): PaymentRowInput | null {
  if (invoice.billing_reason !== "subscription_cycle") return null;
  if (!invoice.amount_paid || invoice.amount_paid <= 0) return null;

  const feeKnown = charge !== null && charge.feeCents !== null;
  return {
    kind: "renewal",
    amountCents: invoice.amount_paid,
    currency: (invoice.currency ?? "cad").toLowerCase(),
    stripeFeeCents: feeKnown ? charge!.feeCents : null,
    taxCents: invoice.tax ?? 0,
    stripeObjectId: invoice.id,
    stripeEventId: event.id,
    stripeSessionId: null,
    stripePaymentIntentId: charge?.paymentIntentId ?? null,
    stripeChargeId: charge?.chargeId ?? null,
    bookingId: owner.bookingIds.length === 1 ? owner.bookingIds[0]! : null,
    bookingIds: owner.bookingIds.length > 0 ? owner.bookingIds.join(",") : null,
    venueId: owner.venueId,
    relatedPaymentId: null,
    livemode: event.livemode,
    paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : (charge?.paidAt ?? new Date(event.created * 1000)),
    note: feeKnown ? null : FEE_PENDING_NOTE,
  };
}

export interface OriginalPaymentFacts {
  id: number;
  venueId: number | null;
  bookingId: number | null;
  bookingIds: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  livemode: boolean;
  currency: string;
}

export interface RefundFacts {
  id: string;
  amount: number; // positive, as Stripe reports it
  currency: string | null;
  created: number;
}

// Refunds are negative rows linked to the original payment. livemode is inherited from
// the original (a refund of a live charge is live money whatever the event says).
// Stripe does not report a fee on a refund, so the fee stays null and is not counted as
// "missing" by getIncomeForDay (refund rows are excluded from that check).
export function buildRefundPaymentRow(refund: RefundFacts, original: OriginalPaymentFacts, event: EventFacts): PaymentRowInput {
  return {
    kind: "refund",
    amountCents: -Math.abs(refund.amount),
    currency: (refund.currency ?? original.currency).toLowerCase(),
    stripeFeeCents: null,
    taxCents: 0,
    stripeObjectId: refund.id,
    stripeEventId: event.id,
    stripeSessionId: null,
    stripePaymentIntentId: original.stripePaymentIntentId,
    stripeChargeId: original.stripeChargeId,
    bookingId: original.bookingId,
    bookingIds: original.bookingIds,
    venueId: original.venueId,
    relatedPaymentId: original.id,
    livemode: original.livemode,
    paidAt: new Date(refund.created * 1000),
    note: null,
  };
}

// An admin who clicks "mark refunded" after refunding in the Stripe dashboard creates a
// manual row; Stripe's own charge.refunded webhook then reports the same refund. Without
// reconciling, one refund would be subtracted twice.
export function manualRefundObjectId(bookingId: number): string {
  return `manual-refund-booking-${bookingId}`;
}

function isManualObjectId(id: string): boolean {
  return id.startsWith("manual-refund-booking-");
}

export type RefundDecision = { action: "insert" } | { action: "skip" } | { action: "adopt"; existingObjectId: string };

export function decideRefundRecord(
  existing: { stripeObjectId: string; amountCents: number }[],
  incoming: { stripeObjectId: string; amountCents: number; manual: boolean }
): RefundDecision {
  if (existing.some((e) => e.stripeObjectId === incoming.stripeObjectId)) return { action: "skip" };

  const sameAmount = existing.filter((e) => Math.abs(e.amountCents) === Math.abs(incoming.amountCents));

  if (incoming.manual) {
    // Stripe already told us about a refund of this size: the manual click is redundant.
    return sameAmount.some((e) => !isManualObjectId(e.stripeObjectId)) ? { action: "skip" } : { action: "insert" };
  }

  const manualMatch = sameAmount.find((e) => isManualObjectId(e.stripeObjectId));
  return manualMatch ? { action: "adopt", existingObjectId: manualMatch.stripeObjectId } : { action: "insert" };
}

export interface OwnershipLookup {
  regionExists(slug: string): Promise<boolean>;
  venueExists(id: number): Promise<boolean>;
  bookingsById(ids: number[]): Promise<{ id: number; venueId: number | null; stripeSessionId: string | null }[]>;
}

export type OwnershipResult = { ok: true; venueId: number | null } | { ok: false; reason: string };

// Second line of defence after classifyCheckoutSession: the metadata matched a shape this
// site uses, but the Stripe account is shared, so confirm the ids really exist in this
// database before a row is written. A booking must also not be tied to a different
// Stripe session than the one being recorded.
export async function confirmLocalOwnership(
  sessionId: string,
  c: SessionClassification,
  lookup: OwnershipLookup
): Promise<OwnershipResult> {
  if (c.kind === "tip") {
    return c.regionSlug && (await lookup.regionExists(c.regionSlug))
      ? { ok: true, venueId: null }
      : { ok: false, reason: `tip region "${c.regionSlug}" does not exist here` };
  }
  if (c.kind === "credit_bundle") {
    return c.venueId !== null && (await lookup.venueExists(c.venueId))
      ? { ok: true, venueId: c.venueId }
      : { ok: false, reason: `credit bundle venue ${c.venueId} does not exist here` };
  }
  const found = await lookup.bookingsById(c.bookingIds);
  if (found.length !== c.bookingIds.length) return { ok: false, reason: "one or more booking ids do not exist here" };
  if (found.some((b) => b.stripeSessionId !== null && b.stripeSessionId !== sessionId)) {
    return { ok: false, reason: "a booking belongs to a different Stripe session" };
  }
  return { ok: true, venueId: found[0]?.venueId ?? null };
}
