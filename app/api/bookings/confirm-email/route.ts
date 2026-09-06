import { NextRequest, NextResponse } from "next/server";
import { verifyBookingToken, signBookingToken, type BookingSelection } from "@/lib/booking-token";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelownafooddeals.shop";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/advertise?bookingError=expired`);
  }

  const selection = await verifyBookingToken<BookingSelection>(token);
  if (!selection) {
    return NextResponse.redirect(`${SITE_URL}/advertise?bookingError=expired`);
  }

  const { exp: _exp, ...clean } = selection as BookingSelection & { exp: number };
  const verifiedToken = await signBookingToken(
    { ...clean, verifiedAt: Date.now() },
    30 * 60 * 1000
  );

  // verifiedProduct rides alongside the token in plain text -- it's not sensitive (just
  // one of three enum values) and lets /advertise (Task 10) hand the token to the one
  // BookingFlow instance it actually belongs to, without needing to verify the
  // HMAC-signed token client-side (which it can't -- only the server holds the secret).
  return NextResponse.redirect(
    `${SITE_URL}/advertise?verifiedToken=${encodeURIComponent(verifiedToken)}&verifiedProduct=${clean.productType}`
  );
}
