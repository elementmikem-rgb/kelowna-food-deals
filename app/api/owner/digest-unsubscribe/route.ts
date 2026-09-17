import { NextRequest, NextResponse } from "next/server";
import { db, venueOwners } from "@/db";
import { eq } from "drizzle-orm";
import { verifyDigestUnsubscribeToken } from "@/lib/owner-digest-unsubscribe";

// No login required -- same posture as /api/unsubscribe, a one-click link that has to
// work straight from the email itself, not gated behind the owner's separate session.
export async function GET(req: NextRequest) {
  const venueOwnerId = Number(req.nextUrl.searchParams.get("venueOwnerId"));
  const token = req.nextUrl.searchParams.get("token");

  if (!Number.isInteger(venueOwnerId) || !token || !verifyDigestUnsubscribeToken(venueOwnerId, token)) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 });
  }

  await db.update(venueOwners).set({ weeklyDigestOptOut: true }).where(eq(venueOwners.id, venueOwnerId));

  return new NextResponse("You've been unsubscribed from weekly listing stats emails.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
