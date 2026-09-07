import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, venues, specials } from "@/db";
import { bookingProductType, specialCategory } from "@/db/schema";
import { signBookingToken, type BookingSelection } from "@/lib/booking-token";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { pacificTodayISODate } from "@/lib/time";
import { getCurrentRegion } from "@/lib/regions";

const bodySchema = z.object({
  productType: z.enum(bookingProductType),
  venueId: z.number().int().positive(),
  specialId: z.number().int().positive().nullable(),
  category: z.enum(specialCategory).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buyerEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  const region = await getCurrentRegion();
  const SITE_URL = `https://${region.domain}`;

  const { ok } = await checkRateLimit(req, "bookings-verify-email", 5, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }
  // A fully-past range would be charged but could never deliver: the sync job and
  // approveBooking() both only activate a booking whose range covers today. Pacific,
  // not UTC, because every other date decision in this codebase is Pacific.
  if (parsed.data.startDate < pacificTodayISODate()) {
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

  const selection: BookingSelection = parsed.data;
  const token = await signBookingToken(selection, 15 * 60 * 1000);
  const link = `${SITE_URL}/api/bookings/confirm-email?token=${encodeURIComponent(token)}`;

  await sendOutreachEmail({
    to: selection.buyerEmail,
    subject: "Confirm your Kelowna Food Deals booking",
    htmlContent: `<p>Click below to confirm this email and continue your booking:</p><p><a href="${link}">Confirm and continue</a></p><p>This link expires in 15 minutes.</p>`,
  });

  return NextResponse.json({ ok: true });
}
