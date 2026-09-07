import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { getCurrentRegion } from "@/lib/regions";

const tipRequestSchema = z.object({
  amountCents: z
    .number()
    .int()
    .min(100, "Minimum tip is $1")
    .max(50000, "Max tip is $500"),
});

export async function POST(req: NextRequest) {
  // Pinned to the requesting region's own domain rather than derived from the
  // request's Origin header: a forged Origin would otherwise come back inside a
  // real Stripe Checkout URL's redirect targets.
  const region = await getCurrentRegion();
  const SITE_URL = `https://${region.domain}`;

  const body = await req.json().catch(() => null);
  const parsed = tipRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid amount" }, {
      status: 400,
    });
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: "Tip for Kelowna Food Deals",
            description: "Keeps the site running — thank you!",
          },
          unit_amount: parsed.data.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/tip/success`,
    cancel_url: `${SITE_URL}/`,
    // Booking checkouts always carry a bookingId; this is how the admin tip
    // calculator (lib/tips-data.ts) tells the two kinds of checkout apart.
    metadata: { type: "tip" },
  });

  if (!session.url) {
    return NextResponse.json({ error: "failed to create checkout session" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
