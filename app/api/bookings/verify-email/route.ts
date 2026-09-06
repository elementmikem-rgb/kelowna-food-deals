import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bookingProductType, specialCategory } from "@/db/schema";
import { signBookingToken, type BookingSelection } from "@/lib/booking-token";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { checkRateLimit } from "@/lib/request-rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";

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
  const { ok } = await checkRateLimit(req, "bookings-verify-email", 5, 60);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
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
