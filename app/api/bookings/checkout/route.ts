import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql, eq, and, gt, isNull, desc } from "drizzle-orm";
import { db, bookings, monetizationSettings } from "@/db";
import { verifyBookingToken, type BookingSelection } from "@/lib/booking-token";
import { checkAvailability } from "@/lib/booking-availability";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { pacificTodayISODate } from "@/lib/time";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";
// Stripe requires a Checkout session's expires_at to be at least 30 minutes out, so
// the DB-side reservation hold uses the same window rather than a shorter one that
// would create a mismatch between "still payable" and "still reserved." This also
// matches Task 5's verifiedToken TTL (30 min), so the whole post-verification window
// is a consistent 30 minutes end to end.
const HOLD_MS = 30 * 60 * 1000;
// ...but "at least 30 minutes" means a bare now + HOLD_MS lands exactly on Stripe's
// floor, which flooring to whole seconds then pushes *under* it -- and the network
// hop to Stripe eats more of the margin. One extra minute (still far under Stripe's
// 24-hour ceiling) keeps session creation off that boundary. The hold itself stays
// 30 minutes; only the Stripe-side expiry carries the slack.
const STRIPE_EXPIRY_MARGIN_MS = 60_000;

const bodySchema = z.object({ verifiedToken: z.string() });

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

// Deterministic per-product(+category) lock key so two concurrent checkouts for the
// same capped slot serialize here instead of racing the availability check below.
function lockKeyFor(productType: string, category: string | null): string {
  return category ? `booking:${productType}:${category}` : `booking:${productType}`;
}

export async function POST(req: NextRequest) {
  const { ok } = await checkRateLimit(req, "bookings-checkout", 10, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const selection = await verifyBookingToken<BookingSelection & { verifiedAt: number }>(
    parsed.data.verifiedToken
  );
  if (!selection) {
    return NextResponse.json({ error: "Verification link expired -- start again" }, { status: 400 });
  }

  // Defence in depth against a stale-but-unexpired token: the range was validated at
  // verify-email time, but a token signed just before midnight Pacific can be spent
  // just after it, by which point startDate is in the past and the booking could
  // never activate. (verify-email/route.ts runs the same check first.)
  if (selection.startDate < pacificTodayISODate()) {
    return NextResponse.json(
      { error: "That start date has passed -- pick new dates and start again" },
      { status: 400 }
    );
  }

  const [settings] = await db
    .select()
    .from(monetizationSettings)
    .where(eq(monetizationSettings.productType, selection.productType));
  if (!settings) return NextResponse.json({ error: "unknown product" }, { status: 400 });

  const days = daysBetween(selection.startDate, selection.endDate);
  if (days < settings.minDays || days > settings.maxDays) {
    return NextResponse.json(
      { error: `Choose between ${settings.minDays} and ${settings.maxDays} days` },
      { status: 400 }
    );
  }
  const priceCents = settings.priceCentsPerDay * days;
  const category = selection.productType === "category_sponsor" ? selection.category : null;

  // One clock reading drives both the DB hold and Stripe's expiry, so they can't
  // drift apart by however long the queries in between take.
  const now = Date.now();

  // The verifiedToken is a stateless HMAC, so nothing stops it being POSTed here
  // repeatedly inside its 30-minute window -- and each POST used to mint another
  // pending_payment row holding capacity, which is enough to exhaust every featured
  // slot without ever paying. Instead: if this buyer already has a live hold on this
  // exact selection, hand back the checkout session they already have. This covers
  // the honest double-click and the malicious replay with the same code path.
  const [existingHold] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.buyerEmail, selection.buyerEmail),
        eq(bookings.productType, selection.productType),
        eq(bookings.startDate, selection.startDate),
        eq(bookings.endDate, selection.endDate),
        category ? eq(bookings.category, category) : isNull(bookings.category),
        eq(bookings.status, "pending_payment"),
        gt(bookings.reservedUntil, new Date(now))
      )
    )
    .orderBy(desc(bookings.id))
    .limit(1);

  if (existingHold) {
    if (existingHold.stripeSessionId) {
      try {
        const existingSession = await getStripe().checkout.sessions.retrieve(
          existingHold.stripeSessionId
        );
        if (existingSession.status === "open" && existingSession.url) {
          return NextResponse.json({ url: existingSession.url });
        }
      } catch (err) {
        console.error("Stripe checkout session retrieve failed:", err);
      }
    }
    // Either Stripe says the session is expired/complete, or we never got a session
    // id onto the row at all. Retire the stale hold so it stops counting toward
    // capacity, then fall through and reserve a genuinely new one below.
    await db.update(bookings).set({ status: "expired" }).where(eq(bookings.id, existingHold.id));
  }

  const booking = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKeyFor(selection.productType, category)}))`);

    const available = await checkAvailability(
      tx,
      selection.productType,
      category,
      settings.capCount,
      selection.startDate,
      selection.endDate
    );
    if (!available) return null;

    const [created] = await tx
      .insert(bookings)
      .values({
        productType: selection.productType,
        venueId: selection.venueId,
        specialId: selection.specialId,
        category,
        startDate: selection.startDate,
        endDate: selection.endDate,
        status: "pending_payment",
        reservedUntil: new Date(now + HOLD_MS),
        priceCents,
        buyerEmail: selection.buyerEmail,
        buyerVerifiedAt: new Date(selection.verifiedAt),
      })
      .returning();
    return created;
  });

  if (!booking) {
    return NextResponse.json({ error: "Those dates are no longer available" }, { status: 409 });
  }

  let sessionUrl: string | null = null;
  let sessionId: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: `${selection.productType} placement — Kelowna Food Deals` },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: selection.buyerEmail,
      client_reference_id: String(booking.id),
      metadata: { bookingId: String(booking.id) },
      expires_at: Math.ceil((now + HOLD_MS + STRIPE_EXPIRY_MARGIN_MS) / 1000),
      success_url: `${SITE_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/advertise`,
    });
    sessionUrl = session.url;
    sessionId = session.id;
  } catch (err) {
    // Was a bare `catch {}`: a real Stripe outage (or the expires_at boundary bug
    // above) surfaced only as a generic 502 with no server-side trace at all.
    console.error("Stripe checkout session creation failed:", err);
    sessionUrl = null;
  }

  if (!sessionUrl || !sessionId) {
    await db.update(bookings).set({ status: "expired" }).where(eq(bookings.id, booking.id));
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }

  await db.update(bookings).set({ stripeSessionId: sessionId }).where(eq(bookings.id, booking.id));

  return NextResponse.json({ url: sessionUrl });
}
