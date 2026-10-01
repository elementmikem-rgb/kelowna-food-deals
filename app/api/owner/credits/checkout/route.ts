import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, creditBundles } from "@/db";
import { getOwnerSession } from "@/lib/venue-owner-auth";
import { getStripe, getOrCreateStripeCustomerId } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/request-rate-limit";

const bodySchema = z.object({
  venueId: z.number().int().positive(),
  bundleId: z.number().int().positive(),
});

const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

// Starts a one-time Stripe Checkout for a prepaid credit bundle (see
// project_todaystab_venue_credit_system memory / lib/credits.ts). No local pending
// row is created here -- unlike a booking, a credit purchase has no availability/
// capacity to hold, so the Stripe session's metadata alone is enough for the webhook
// (handleCreditBundlePurchase in app/api/webhooks/stripe/route.ts) to grant credits
// once payment completes.
export async function POST(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session || session.venueIds.length === 0) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ok } = await checkRateLimit(req, "owner-credits-checkout", 10, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { venueId, bundleId } = parsed.data;

  if (!session.venueIds.includes(venueId)) {
    return NextResponse.json({ error: "that venue isn't linked to your account" }, { status: 403 });
  }

  const [bundle] = await db
    .select()
    .from(creditBundles)
    .where(and(eq(creditBundles.id, bundleId), eq(creditBundles.active, true)));
  if (!bundle) return NextResponse.json({ error: "unknown or inactive bundle" }, { status: 400 });

  const customerId = await getOrCreateStripeCustomerId(session.venueOwnerId);

  let sessionUrl: string | null = null;
  try {
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: `${bundle.name} — ${bundle.credits} credits` },
            unit_amount: bundle.priceCents,
          },
          quantity: 1,
        },
      ],
      customer: customerId,
      // Belt and braces alongside the webhook's own payment_status check -- see
      // app/api/webhooks/stripe/route.ts.
      excluded_payment_method_types: ["acss_debit"],
      metadata: {
        type: "credit_bundle",
        venueId: String(venueId),
        credits: String(bundle.credits),
      },
      success_url: `${SITE_URL}/owner/venue/${venueId}?creditsCheckout=success`,
      cancel_url: `${SITE_URL}/owner/venue/${venueId}?creditsCheckout=cancelled`,
    });
    sessionUrl = checkoutSession.url;
  } catch (err) {
    console.error("Credit bundle Stripe checkout session creation failed:", err);
  }

  if (!sessionUrl) {
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }

  return NextResponse.json({ url: sessionUrl });
}
