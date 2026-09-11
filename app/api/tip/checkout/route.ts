import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { getRegionBySlug } from "@/lib/regions";

const tipRequestSchema = z.object({
  amountCents: z
    .number()
    .int()
    .min(100, "Minimum tip is $1")
    .max(50000, "Max tip is $500"),
  // Region has no path segment of its own on an API route under path-based
  // routing (todaystab.com/kelowna/... has no equivalent /api/tip/checkout
  // prefix) -- the calling page passes its own region explicitly instead of
  // this route inferring it from the request the way getCurrentRegion() used to.
  regionSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = tipRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid amount" }, {
      status: 400,
    });
  }

  const region = await getRegionBySlug(parsed.data.regionSlug);
  if (!region) return NextResponse.json({ error: "unknown region" }, { status: 400 });
  const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${region.slug}`;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: `Tip for ${region.brandName}`,
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
    // regionSlug lets that same admin page scope tips by region, matching
    // every other admin list.
    metadata: { type: "tip", regionSlug: region.slug },
  });

  if (!session.url) {
    return NextResponse.json({ error: "failed to create checkout session" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
