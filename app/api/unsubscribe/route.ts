import { NextRequest, NextResponse } from "next/server";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { getRegionById } from "@/lib/regions";

export async function GET(req: NextRequest) {
  const venueId = Number(req.nextUrl.searchParams.get("venueId"));
  const token = req.nextUrl.searchParams.get("token");

  if (!Number.isInteger(venueId) || !token || !verifyUnsubscribeToken(venueId, token)) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 });
  }

  const [venue] = await db
    .update(venues)
    .set({ unsubscribedAt: new Date() })
    .where(eq(venues.id, venueId))
    .returning({ regionId: venues.regionId });

  // Named after the venue's OWN region rather than the domain this request landed
  // on. The outreach email builds the link from the venue's region domain, so the
  // two normally agree, but a forwarded or rewritten link must still confirm the
  // list the venue actually left.
  const region = venue ? await getRegionById(venue.regionId) : null;
  const brand = region?.brandName ?? "our";

  return new NextResponse(`You've been unsubscribed from ${brand} outreach emails.`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
