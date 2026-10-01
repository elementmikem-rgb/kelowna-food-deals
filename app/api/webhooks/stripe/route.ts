import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, and } from "drizzle-orm";
import { db, bookings, monetizationSettings, venues, creditLedger } from "@/db";
import { getStripe } from "@/lib/stripe";
import { checkAvailability } from "@/lib/booking-availability";
import { addDaysISO } from "@/lib/time";
import { sendReportEmail } from "@/lib/brevo";
import { grantPurchasedCredits } from "@/lib/credits";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    // "completed" fires as soon as the customer finishes the checkout form -- for an
    // instant method (card, Link, wallets) that's the same moment the payment clears,
    // but for a delayed method (bank debit) it fires immediately while payment_status
    // is still "unpaid"; the real confirmation arrives later as this separate event.
    // Routed to the same handler, which only fulfills when payment_status is actually
    // "paid"/"no_payment_required" -- see handleCheckoutCompleted and
    // handleCreditBundlePurchase.
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object as CheckoutSessionLike);
      break;
    case "checkout.session.async_payment_failed":
      await handleAsyncPaymentFailed(event.data.object as CheckoutSessionLike);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as InvoiceLike);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as InvoiceLike);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as SubscriptionLike);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

interface CheckoutSessionLike {
  id: string;
  mode: "payment" | "subscription" | "setup";
  payment_intent: string | null;
  subscription: string | null;
  metadata: Record<string, string> | null;
  // "paid" / "no_payment_required" means the money has actually arrived (or there was
  // nothing to pay). "unpaid" means a delayed payment method (e.g. a bank debit) is
  // still pending -- confirmation comes later as a separate async_payment_succeeded/
  // async_payment_failed event. Reacting to session "completion" alone without this
  // would fulfill a booking or grant credits before payment actually cleared.
  payment_status: "paid" | "unpaid" | "no_payment_required";
}
interface InvoiceLike {
  id: string;
  billing_reason: string | null;
  // This API version moved subscription off the top-level Invoice object into
  // parent.subscription_details.subscription -- see node_modules/stripe's Invoices.d.ts.
  parent: { subscription_details?: { subscription: string | Record<string, unknown> | null } | null } | null;
}

function invoiceSubscriptionId(invoice: InvoiceLike): string | null {
  const sub = invoice.parent?.subscription_details?.subscription ?? null;
  return typeof sub === "string" ? sub : null;
}
interface SubscriptionLike {
  id: string;
}

// Two shapes share this webhook: the anonymous single-item flow
// (app/api/bookings/checkout/route.ts) sets metadata.bookingId, the owner-dashboard
// cart (app/api/owner/cart-checkout/route.ts) sets metadata.bookingIds as a
// comma-joined list since one Stripe session there can cover several booking rows.
function parseBookingIds(session: CheckoutSessionLike): number[] {
  return session.metadata?.bookingIds
    ? session.metadata.bookingIds.split(",").map(Number).filter(Number.isInteger)
    : Number.isInteger(Number(session.metadata?.bookingId))
      ? [Number(session.metadata?.bookingId)]
      : [];
}

// A delayed payment method's final answer: the authorization never cleared. Release
// the hold these bookings put on capacity instead of leaving them stuck in
// pending_payment until reservedUntil quietly lapses on its own.
async function handleAsyncPaymentFailed(session: CheckoutSessionLike) {
  if (session.metadata?.type === "credit_bundle") return; // nothing was ever granted
  const bookingIds = parseBookingIds(session);
  if (bookingIds.length === 0) return;

  await db
    .update(bookings)
    .set({ status: "expired" })
    .where(and(inArray(bookings.id, bookingIds), eq(bookings.status, "pending_payment")));
}

async function handleCheckoutCompleted(session: CheckoutSessionLike) {
  // A third shape shares this webhook: a credit bundle purchase
  // (app/api/owner/credits/checkout/route.ts) sets metadata.type = "credit_bundle"
  // instead of a bookingId -- no bookings row is ever created for this kind of
  // session, so it's routed to its own handler before the booking-id parsing below.
  if (session.metadata?.type === "credit_bundle") {
    await handleCreditBundlePurchase(session);
    return;
  }

  // A delayed payment method can fire "completed" before the money has actually
  // cleared (payment_status "unpaid") -- wait for the async_payment_succeeded event,
  // which re-invokes this same handler once payment_status reads "paid". Fulfilling
  // on "completed" alone would move a booking to pending_approval (visible to the
  // admin, counting toward capacity) before payment was confirmed.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return;
  }

  const bookingIds = parseBookingIds(session);

  if (bookingIds.length === 0) {
    console.error("Stripe webhook: no bookingId(s) in session metadata", session.id);
    return;
  }

  const processed: { booking: typeof bookings.$inferSelect; conflict: boolean }[] = [];

  for (const bookingId of bookingIds) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) {
      console.error("Stripe webhook: booking not found", bookingId);
      continue;
    }
    if (booking.status !== "pending_payment") {
      // Already processed (Stripe retry) -- idempotent no-op.
      continue;
    }

    const [settings] = await db
      .select()
      .from(monetizationSettings)
      .where(eq(monetizationSettings.productType, booking.productType));

    // Capacity is scoped per region (see booking-availability.ts), and the webhook has no
    // regionSlug of its own to resolve from -- the booking's own venue is the source of
    // truth for which region it belongs to.
    const [venue] = booking.venueId
      ? await db.select({ regionId: venues.regionId }).from(venues).where(eq(venues.id, booking.venueId))
      : [];

    // Re-check for a conflict introduced between checkout and payment completion (e.g.
    // another booking for the same slot was approved in the meantime). Payment already
    // succeeded, so this can't be silently dropped -- it's flagged for the admin instead.
    const stillAvailable = settings && venue
      ? await checkAvailability(
          db,
          booking.productType,
          booking.category,
          booking.categoryKind,
          settings.capCount,
          venue.regionId,
          booking.startDate,
          booking.endDate,
          booking.id
        )
      : true;

    await db
      .update(bookings)
      .set({
        status: "pending_approval",
        stripePaymentIntentId: session.payment_intent,
        // Set for a subscription-mode session -- session.subscription is only populated
        // once the customer actually completes checkout (never available earlier, at
        // session-creation time in cart-checkout/route.ts), so this webhook is the first
        // point the row can record which Stripe subscription it belongs to.
        stripeSubscriptionId: session.mode === "subscription" ? session.subscription : null,
        conflictDetected: !stillAvailable,
      })
      .where(eq(bookings.id, bookingId));

    processed.push({ booking, conflict: !stillAvailable });
  }

  if (processed.length > 0) {
    try {
      const subject =
        processed.length === 1
          ? `New booking pending approval: ${processed[0]!.booking.productType} #${processed[0]!.booking.id}${processed[0]!.conflict ? " (CONFLICT)" : ""}`
          : `New booking pending approval: ${processed.length} items in one order${processed.some((p) => p.conflict) ? " (CONFLICT)" : ""}`;
      const textContent = processed
        .map(
          ({ booking, conflict }) =>
            `Product: ${booking.productType}${conflict ? " (CONFLICT)" : ""}${booking.autoRenew ? " (auto-renews monthly)" : ""}\nVenue ID: ${booking.venueId}${booking.eventId ? `\nEvent ID: ${booking.eventId}` : ""}\nDates: ${booking.startDate} to ${booking.endDate}\nBuyer: ${booking.buyerEmail}\nPrice paid: $${(booking.priceCents / 100).toFixed(2)}`
        )
        .join("\n\n");
      await sendReportEmail({
        subject,
        textContent: `${textContent}\n\nReview at /admin/sponsored`,
      });
    } catch (err) {
      console.error("Failed to send booking notification email:", err);
    }
  }
}

async function handleCreditBundlePurchase(session: CheckoutSessionLike) {
  // See the identical check in handleCheckoutCompleted -- a delayed payment method
  // can fire "completed" before payment_status reads "paid". Granting credits here
  // would hand out spendable balance before the money actually arrived.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return;
  }

  const venueId = Number(session.metadata?.venueId);
  const credits = Number(session.metadata?.credits);
  if (!Number.isInteger(venueId) || !Number.isInteger(credits) || credits <= 0) {
    console.error("Stripe webhook: invalid credit_bundle metadata", session.id, session.metadata);
    return;
  }

  // Idempotent against Stripe retries: a "purchase" ledger row already recorded for
  // this exact stripeSessionId means this session was already granted, same posture
  // as handleCheckoutCompleted's booking.status !== "pending_payment" check above.
  const [existing] = await db
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.stripeSessionId, session.id), eq(creditLedger.reason, "purchase")));
  if (existing) return;

  await db.transaction(async (tx) => grantPurchasedCredits(tx, venueId, credits, session.id));

  try {
    await sendReportEmail({
      subject: `Credit bundle purchased: ${credits} credits`,
      textContent: `Venue ID: ${venueId}\nCredits granted: ${credits}\nStripe session: ${session.id}`,
    });
  } catch (err) {
    console.error("Failed to send credit bundle notification email:", err);
  }
}

// A renewal invoice for an existing subscription -- billing_reason distinguishes this
// from the *first* invoice, which checkout.session.completed above already handles (and
// which still needs a human to approve once). Only "subscription_cycle" renewals land
// here, so a booking is approved exactly once and every later cycle just extends it --
// this is Mike's "first period only" call from the Phase 4 planning discussion.
async function handleInvoicePaid(invoice: InvoiceLike) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (invoice.billing_reason !== "subscription_cycle" || !subscriptionId) return;

  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.stripeSubscriptionId, subscriptionId), eq(bookings.status, "approved")));

  for (const booking of rows) {
    await db
      .update(bookings)
      .set({ endDate: addDaysISO(booking.endDate, 30) })
      .where(eq(bookings.id, booking.id));
  }

  if (rows.length === 0) {
    // Not necessarily an error -- e.g. the first period was rejected rather than
    // approved, and Stripe kept billing anyway until the admin cancels the subscription.
    console.error("Stripe webhook: invoice.paid renewal with no approved bookings for subscription", subscriptionId);
  }
}

// Stripe retries a failed renewal charge on its own schedule and fires
// customer.subscription.deleted if it ultimately gives up -- this handler doesn't touch
// booking status at all, just makes sure a human finds out before that happens instead
// of a sponsorship silently going unpaid for weeks.
async function handleInvoicePaymentFailed(invoice: InvoiceLike) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  const rows = await db.select().from(bookings).where(eq(bookings.stripeSubscriptionId, subscriptionId));
  if (rows.length === 0) return;

  try {
    await sendReportEmail({
      subject: `Auto-renew payment failed: subscription ${subscriptionId}`,
      textContent: rows
        .map((b) => `Product: ${b.productType}\nVenue ID: ${b.venueId}\nCurrent window ends: ${b.endDate}\nBuyer: ${b.buyerEmail}`)
        .join("\n\n"),
    });
  } catch (err) {
    console.error("Failed to send payment-failed notification email:", err);
  }
}

// Terminal state, whether the owner cancelled themselves (Stripe Customer Portal) or
// Stripe gave up retrying a failed charge -- turns off autoRenew so the booking just
// expires normally at its current endDate instead of anything trying to extend it again.
async function handleSubscriptionDeleted(subscription: SubscriptionLike) {
  const rows = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.stripeSubscriptionId, subscription.id));
  if (rows.length === 0) return;
  await db
    .update(bookings)
    .set({ autoRenew: false })
    .where(inArray(bookings.id, rows.map((r) => r.id)));
}
