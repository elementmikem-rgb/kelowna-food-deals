import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, venues, specials } from "@/db";
import { bookingProductType, specialCategory } from "@/db/schema";
import { signBookingToken, type BookingSelection } from "@/lib/booking-token";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { regionTodayISODate } from "@/lib/time";
import { getRegionBySlug, getRegionContext } from "@/lib/regions";

const bodySchema = z.object({
  productType: z.enum(bookingProductType),
  venueId: z.number().int().positive(),
  specialId: z.number().int().positive().nullable(),
  category: z.enum(specialCategory).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buyerEmail: z.string().email(),
  // See tip/checkout/route.ts's comment -- an API route has no path segment
  // of its own to resolve region from under path-based routing.
  regionSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { ok } = await checkRateLimit(req, "bookings-verify-email", 5, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const region = await getRegionBySlug(parsed.data.regionSlug);
  if (!region) return NextResponse.json({ error: "unknown region" }, { status: 400 });
  const { timezone } = await getRegionContext(region);
  const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${region.slug}`;
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }
  // A fully-past range would be charged but could never deliver: the sync job and
  // approveBooking() both only activate a booking whose range covers today. The
  // region's own timezone, not UTC, since this is a per-region public endpoint.
  if (parsed.data.startDate < regionTodayISODate(timezone)) {
    return NextResponse.json({ error: "Start date can't be in the past" }, { status: 400 });
  }

  // Zod only proves these are positive integers. Confirm they name real, live rows
  // before we sign a token that checkout will trust: an unknown venueId would blow
  // up as a foreign-key violation inside the checkout transaction (after the buyer
  // has already verified their email), and an unchecked specialId would let a
  // crafted request pay to boost a special belonging to some other venue.
  const [venue] = await db
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.id, parsed.data.venueId), eq(venues.active, true)));
  if (!venue) {
    return NextResponse.json({ error: "That venue isn't available for booking" }, { status: 400 });
  }

  if (parsed.data.productType === "boost") {
    if (parsed.data.specialId === null) {
      return NextResponse.json({ error: "Pick which special to boost" }, { status: 400 });
    }
    const [special] = await db
      .select({ id: specials.id })
      .from(specials)
      .where(
        and(
          eq(specials.id, parsed.data.specialId),
          eq(specials.venueId, parsed.data.venueId),
          isNull(specials.archivedAt)
        )
      );
    if (!special) {
      return NextResponse.json({ error: "That special isn't available for boosting" }, { status: 400 });
    }
  }

  // regionSlug is only needed to route this request itself -- confirm-email
  // gets it separately via its own query param below (a fresh GET from an
  // email link has no page context to carry it through any other way), so
  // it's excluded from what actually gets signed into the booking token.
  const { regionSlug: _regionSlug, ...selection } = parsed.data;
  const token = await signBookingToken(selection as BookingSelection, 15 * 60 * 1000);
  // Deliberately the bare domain, not SITE_URL -- /api/bookings/confirm-email
  // is a top-level route with no region segment of its own, unlike the
  // region-prefixed page URLs SITE_URL is built for elsewhere in this file.
  const link = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/api/bookings/confirm-email?token=${encodeURIComponent(token)}&region=${region.slug}`;

  await sendOutreachEmail({
    to: selection.buyerEmail,
    subject: `Confirm your ${region.brandName} booking`,
    htmlContent: `<p>Click below to confirm this email and continue your booking:</p><p><a href="${link}">Confirm and continue</a></p><p>This link expires in 15 minutes.</p>`,
  });

  return NextResponse.json({ ok: true });
}
