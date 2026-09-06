import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bookings, monetizationSettings } from "@/db";
import { getStripe } from "@/lib/stripe";
import { checkAvailability } from "@/lib/booking-availability";
import { sendReportEmail } from "@/lib/brevo";

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

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as { id: string; payment_intent: string | null; metadata: Record<string, string> | null };
  const bookingId = Number(session.metadata?.bookingId);
  if (!Number.isInteger(bookingId)) {
    console.error("Stripe webhook: no bookingId in session metadata", session.id);
    return NextResponse.json({ received: true });
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) {
    console.error("Stripe webhook: booking not found", bookingId);
    return NextResponse.json({ received: true });
  }
  if (booking.status !== "pending_payment") {
    // Already processed (Stripe retry) -- idempotent no-op.
    return NextResponse.json({ received: true });
  }

  const [settings] = await db
    .select()
    .from(monetizationSettings)
    .where(eq(monetizationSettings.productType, booking.productType));

  // Re-check for a conflict introduced between checkout and payment completion (e.g.
  // another booking for the same slot was approved in the meantime). Payment already
  // succeeded, so this can't be silently dropped -- it's flagged for the admin instead.
  const stillAvailable = settings
    ? await checkAvailability(
        db,
        booking.productType,
        booking.category,
        settings.capCount,
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
      conflictDetected: !stillAvailable,
    })
    .where(eq(bookings.id, bookingId));

  try {
    await sendReportEmail({
      subject: `New booking pending approval: ${booking.productType} #${booking.id}${!stillAvailable ? " (CONFLICT)" : ""}`,
      textContent: `Product: ${booking.productType}\nVenue ID: ${booking.venueId}\nDates: ${booking.startDate} to ${booking.endDate}\nBuyer: ${booking.buyerEmail}\nPrice paid: $${(booking.priceCents / 100).toFixed(2)}\n\nReview at /admin/sponsored`,
    });
  } catch (err) {
    console.error("Failed to send booking notification email:", err);
  }

  return NextResponse.json({ received: true });
}
