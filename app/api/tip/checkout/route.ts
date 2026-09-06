import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";

const tipRequestSchema = z.object({
  amountCents: z
    .number()
    .int()
    .min(100, "Minimum tip is $1")
    .max(50000, "Max tip is $500"),
});

// Pinned rather than derived from the request's Origin header: a forged Origin
// would otherwise come back inside a real Stripe Checkout URL's redirect targets.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";

export async function POST(req: NextRequest) {
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
  });

  if (!session.url) {
    return NextResponse.json({ error: "failed to create checkout session" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
