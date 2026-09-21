import { NextRequest, NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/venue-owner-auth";
import { getStripe, getOrCreateStripeCustomerId } from "@/lib/stripe";

const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

// Redirects an authenticated owner to Stripe's hosted Customer Portal -- card
// management, invoice history, and (once Phase 4 subscriptions exist) cancellation all
// live there instead of custom-built UI here, out of PCI scope for this app entirely.
export async function GET(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session || session.venueIds.length === 0) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const customerId = await getOrCreateStripeCustomerId(session.venueOwnerId);
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${SITE_URL}/owner/venue/${session.venueIds[0]}`,
  });

  return NextResponse.redirect(portalSession.url, { status: 303 });
}
