import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db, bookings, monetizationSettings } from "@/db";
import { verifyBookingToken, type BookingSelection } from "@/lib/booking-token";
import { checkAvailability } from "@/lib/booking-availability";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/request-rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";
const HOLD_MS = 15 * 60 * 1000;

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
        reservedUntil: new Date(Date.now() + HOLD_MS),
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
      expires_at: Math.floor((Date.now() + HOLD_MS) / 1000),
      success_url: `${SITE_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/advertise`,
    });
    sessionUrl = session.url;
    sessionId = session.id;
  } catch {
    sessionUrl = null;
  }

  if (!sessionUrl || !sessionId) {
    await db.update(bookings).set({ status: "expired" }).where(eq(bookings.id, booking.id));
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }

  await db.update(bookings).set({ stripeSessionId: sessionId }).where(eq(bookings.id, booking.id));

  return NextResponse.json({ url: sessionUrl });
}
