import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql, eq, inArray } from "drizzle-orm";
import { db, bookings, monetizationSettings, venues, specials, events, venueOwners } from "@/db";
import { getOwnerSession } from "@/lib/venue-owner-auth";
import { getStripe, getOrCreateStripeCustomerId } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { checkAvailability } from "@/lib/booking-availability";
import { daysInclusive, addDaysISO } from "@/lib/time";
import { stripeFeeCents } from "@/lib/stripe-fee";
import { spendCredits, centsToCredits, InsufficientCreditsError } from "@/lib/credits";
import type { BookingProductType, BookingStatus, SpecialCategory, EventType, SponsorCategoryKind } from "@/db/schema";

// Same 30-min hold used by the anonymous checkout path (app/api/bookings/checkout/route.ts)
// -- kept in sync deliberately, not imported, since the two flows are independent enough
// (this one skips email verification entirely, trusting the owner session instead) that
// sharing a constant across them would be a coincidental coupling, not a real one.
const HOLD_MS = 30 * 60 * 1000;
const STRIPE_EXPIRY_MARGIN_MS = 60_000;
// Auto-renew items always bill monthly regardless of the product's own min/max-days
// range -- see the AskUserQuestion decision in cart-checkout's history: Stripe requires
// every line item on one subscription to share the same billing interval, so a custom
// per-item renewal length would force a separate subscription (and a separate checkout
// redirect) per differently-sized item. 30 days keeps every auto-renew item on one
// shared monthly cadence so they can still be bundled into a single checkout.
const AUTO_RENEW_WINDOW_DAYS = 30;

const itemSchema = z
  .object({
    productType: z.enum(["featured", "boost", "category_sponsor"]),
    venueId: z.number().int().positive(),
    specialId: z.number().int().positive().nullable().default(null),
    eventId: z.number().int().positive().nullable().default(null),
    category: z.string().nullable().default(null),
    categoryKind: z.enum(["special", "event"]).nullable().default(null),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // Ignored server-side when autoRenew is true (see AUTO_RENEW_WINDOW_DAYS) -- kept
    // optional rather than required so the client doesn't have to fabricate one.
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    autoRenew: z.boolean().default(false),
  })
  .refine((item) => item.autoRenew || (item.endDate && item.endDate >= item.startDate), {
    message: "endDate must be on or after startDate",
  });

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(10),
  // Spend from the venue's credit wallet instead of paying by card. Never combined
  // with autoRenew (see the check below) -- credits are a one-time-purchase payment
  // rail only, same scope decision as Stripe's own one-time-vs-subscription split.
  payWithCredits: z.boolean().default(false),
});

function lockKeyFor(regionId: number, productType: string, category: string | null, categoryKind: string | null): string {
  return category
    ? `booking:${regionId}:${productType}:${categoryKind}:${category}`
    : `booking:${regionId}:${productType}`;
}

const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

// The dashboard-embedded counterpart to app/api/bookings/checkout/route.ts's anonymous
// single-item flow: multi-item (a real cart), no email-verification step (the owner
// session already proves identity), every venueId must belong to the caller's own
// session -- this is the one thing that can't be relaxed even though everything else
// here is deliberately less strict than the public flow.
export async function POST(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session || session.venueIds.length === 0) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ok } = await checkRateLimit(req, "owner-cart-checkout", 10, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const items = parsed.data.items;
  const payWithCredits = parsed.data.payWithCredits;

  // One Stripe Checkout Session is either mode: "payment" or mode: "subscription", never
  // both -- a cart mixing one-time and auto-renew items has to become two separate
  // checkouts, which this endpoint doesn't try to orchestrate. The dashboard cart UI
  // keeps the two kinds in separate lists precisely so it never sends a mixed request.
  const isAutoRenew = items[0]!.autoRenew;
  if (items.some((i) => i.autoRenew !== isAutoRenew)) {
    return NextResponse.json(
      { error: "check out one-time and auto-renew items separately" },
      { status: 400 }
    );
  }
  if (payWithCredits && isAutoRenew) {
    return NextResponse.json({ error: "credits can't pay for an auto-renewing item" }, { status: 400 });
  }

  for (const item of items) {
    if (!session.venueIds.includes(item.venueId)) {
      return NextResponse.json({ error: "one of these venues isn't linked to your account" }, { status: 403 });
    }
  }

  const venueIds = [...new Set(items.map((i) => i.venueId))];
  const venueRows = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(inArray(venues.id, venueIds));
  const venueById = new Map(venueRows.map((v) => [v.id, v]));

  const settingsRows = await db.select().from(monetizationSettings);
  const settingsByType = new Map(settingsRows.map((s) => [s.productType, s]));

  // Ownership checks for boost targets -- a signed-in owner could otherwise name any
  // specialId/eventId in the platform, not just one on a venue they actually control.
  const specialIds = items.filter((i) => i.specialId !== null).map((i) => i.specialId!);
  const eventIds = items.filter((i) => i.eventId !== null).map((i) => i.eventId!);
  const [specialRows, eventRows] = await Promise.all([
    specialIds.length ? db.select({ id: specials.id, venueId: specials.venueId }).from(specials).where(inArray(specials.id, specialIds)) : [],
    eventIds.length ? db.select({ id: events.id, venueId: events.venueId }).from(events).where(inArray(events.id, eventIds)) : [],
  ]);
  const specialVenueById = new Map(specialRows.map((s) => [s.id, s.venueId]));
  const eventVenueById = new Map(eventRows.map((e) => [e.id, e.venueId]));

  type PricedItem = {
    productType: BookingProductType;
    venueId: number;
    regionId: number;
    specialId: number | null;
    eventId: number | null;
    category: SpecialCategory | EventType | null;
    categoryKind: SponsorCategoryKind | null;
    startDate: string;
    endDate: string;
    priceCents: number;
    capCount: number | null;
    autoRenew: boolean;
  };
  const priced: PricedItem[] = [];

  for (const item of items) {
    const venue = venueById.get(item.venueId);
    if (!venue) return NextResponse.json({ error: "unknown venue" }, { status: 400 });

    const settings = settingsByType.get(item.productType);
    if (!settings) return NextResponse.json({ error: `unknown product ${item.productType}` }, { status: 400 });

    const endDate = item.autoRenew ? addDaysISO(item.startDate, AUTO_RENEW_WINDOW_DAYS - 1) : item.endDate!;
    const days = item.autoRenew ? AUTO_RENEW_WINDOW_DAYS : daysInclusive(item.startDate, endDate);
    if (days < settings.minDays || days > settings.maxDays) {
      return NextResponse.json(
        { error: `${item.productType}: choose between ${settings.minDays} and ${settings.maxDays} days` },
        { status: 400 }
      );
    }

    if (item.productType === "boost") {
      const hasSpecial = item.specialId !== null;
      const hasEvent = item.eventId !== null;
      if (hasSpecial === hasEvent) {
        return NextResponse.json({ error: "boost needs exactly one special or event" }, { status: 400 });
      }
      const targetVenueId = hasSpecial ? specialVenueById.get(item.specialId!) : eventVenueById.get(item.eventId!);
      if (targetVenueId !== item.venueId) {
        return NextResponse.json({ error: "that special/event doesn't belong to this venue" }, { status: 400 });
      }
    }

    const category = item.productType === "category_sponsor" ? (item.category as SpecialCategory | EventType | null) : null;
    const categoryKind = item.productType === "category_sponsor" ? item.categoryKind : null;
    if (item.productType === "category_sponsor" && (!category || !categoryKind)) {
      return NextResponse.json({ error: "category_sponsor needs a category and categoryKind" }, { status: 400 });
    }

    priced.push({
      productType: item.productType,
      venueId: item.venueId,
      regionId: venue.regionId,
      specialId: item.productType === "boost" ? item.specialId : null,
      eventId: item.productType === "boost" ? item.eventId : null,
      category,
      categoryKind,
      startDate: item.startDate,
      endDate,
      priceCents: settings.priceCentsPerDay * days,
      capCount: settings.capCount,
      autoRenew: item.autoRenew,
    });
  }

  const [owner] = await db.select({ email: venueOwners.email }).from(venueOwners).where(eq(venueOwners.id, session.venueOwnerId)).limit(1);
  if (!owner) return NextResponse.json({ error: "owner not found" }, { status: 400 });

  const now = Date.now();

  const lockKeys = [...new Set(priced.map((p) => lockKeyFor(p.regionId, p.productType, p.category, p.categoryKind)))].sort();

  let insufficientCredits: InsufficientCreditsError | null = null;
  const inserted = await db
    .transaction(async (tx) => {
      for (const key of lockKeys) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
      }

      for (const item of priced) {
        const available = await checkAvailability(
          tx,
          item.productType,
          item.category,
          item.categoryKind,
          item.capCount,
          item.regionId,
          item.startDate,
          item.endDate
        );
        if (!available) return null;
      }

      // Credit-paid items skip the Stripe hold entirely -- the spend below is atomic
      // with this insert, so there's nothing left to "hold" a slot for.
      const initialStatus: BookingStatus = payWithCredits ? "pending_approval" : "pending_payment";
      const rows = await tx
        .insert(bookings)
        .values(
          priced.map((item) => ({
            productType: item.productType,
            venueId: item.venueId,
            specialId: item.specialId,
            eventId: item.eventId,
            category: item.category,
            categoryKind: item.categoryKind,
            startDate: item.startDate,
            endDate: item.endDate,
            status: initialStatus,
            reservedUntil: payWithCredits ? null : new Date(now + HOLD_MS),
            priceCents: item.priceCents,
            creditsSpentCents: payWithCredits ? item.priceCents : null,
            buyerEmail: owner.email,
            buyerVerifiedAt: new Date(now),
            autoRenew: item.autoRenew,
          }))
        )
        .returning();

      if (payWithCredits) {
        for (const row of rows) {
          await spendCredits(tx, row.venueId!, centsToCredits(row.priceCents), row.id);
        }
      }

      return rows;
    })
    .catch((err) => {
      if (err instanceof InsufficientCreditsError) {
        insufficientCredits = err;
        return null;
      }
      throw err;
    });

  if (insufficientCredits) {
    return NextResponse.json({ error: "Not enough credits for this cart" }, { status: 402 });
  }
  if (!inserted) {
    return NextResponse.json({ error: "One of these items is no longer available -- refresh and try again" }, { status: 409 });
  }

  if (payWithCredits) {
    return NextResponse.json({ success: true, bookingIds: inserted.map((b) => b.id) });
  }

  const customerId = await getOrCreateStripeCustomerId(session.venueOwnerId);
  const firstVenueId = inserted[0]!.venueId!;

  let sessionUrl: string | null = null;
  let stripeSessionId: string | null = null;
  try {
    if (isAutoRenew) {
      // Subscription mode: every item recurs on the same monthly cadence (see
      // AUTO_RENEW_WINDOW_DAYS), so they can all ride one subscription/session. No card-
      // processing-fee line item here -- unlike the one-time path below, a one-time line
      // item folded into a subscription-mode session only charges once, on the first
      // invoice; it would silently stop applying to renewals. Left out entirely for now
      // rather than charging it inconsistently -- a scope cut, not an oversight.
      const lineItems = inserted.map((b) => {
        const venue = venueById.get(b.venueId!);
        return {
          price_data: {
            currency: "cad",
            product_data: { name: `${b.productType} placement — ${venue?.name ?? "your venue"} (auto-renews monthly)` },
            unit_amount: b.priceCents,
            recurring: { interval: "month" as const, interval_count: 1 },
          },
          quantity: 1,
        };
      });
      const checkoutSession = await getStripe().checkout.sessions.create({
        mode: "subscription",
        line_items: lineItems,
        customer: customerId,
        metadata: { bookingIds: inserted.map((b) => b.id).join(",") },
        success_url: `${SITE_URL}/owner/venue/${firstVenueId}?checkout=success`,
        cancel_url: `${SITE_URL}/owner/venue/${firstVenueId}?checkout=cancelled`,
      });
      sessionUrl = checkoutSession.url;
      stripeSessionId = checkoutSession.id;
    } else {
      const totalPriceCents = inserted.reduce((sum, b) => sum + b.priceCents, 0);
      const feeCents = stripeFeeCents(totalPriceCents);
      const lineItems = inserted.map((b) => {
        const venue = venueById.get(b.venueId!);
        return {
          price_data: {
            currency: "cad",
            product_data: { name: `${b.productType} placement — ${venue?.name ?? "your venue"}` },
            unit_amount: b.priceCents,
          },
          quantity: 1,
        };
      });
      lineItems.push({
        price_data: {
          currency: "cad",
          product_data: { name: "Card processing fee", description: "Covers the payment processor's fee" } as { name: string; description?: string },
          unit_amount: feeCents,
        },
        quantity: 1,
      });
      const checkoutSession = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer: customerId,
        metadata: { bookingIds: inserted.map((b) => b.id).join(",") },
        expires_at: Math.ceil((now + HOLD_MS + STRIPE_EXPIRY_MARGIN_MS) / 1000),
        success_url: `${SITE_URL}/owner/venue/${firstVenueId}?checkout=success`,
        cancel_url: `${SITE_URL}/owner/venue/${firstVenueId}?checkout=cancelled`,
      });
      sessionUrl = checkoutSession.url;
      stripeSessionId = checkoutSession.id;
    }
  } catch (err) {
    console.error("Owner cart Stripe checkout session creation failed:", err);
  }

  if (!sessionUrl || !stripeSessionId) {
    await db
      .update(bookings)
      .set({ status: "expired" })
      .where(inArray(bookings.id, inserted.map((b) => b.id)));
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }

  await db
    .update(bookings)
    .set({ stripeSessionId })
    .where(inArray(bookings.id, inserted.map((b) => b.id)));

  return NextResponse.json({ url: sessionUrl });
}
