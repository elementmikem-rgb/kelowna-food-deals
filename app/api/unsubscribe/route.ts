import { NextRequest, NextResponse } from "next/server";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export async function GET(req: NextRequest) {
  const venueId = Number(req.nextUrl.searchParams.get("venueId"));
  const token = req.nextUrl.searchParams.get("token");

  if (!Number.isInteger(venueId) || !token || !verifyUnsubscribeToken(venueId, token)) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 });
  }

  await db.update(venues).set({ unsubscribedAt: new Date() }).where(eq(venues.id, venueId));

  return new NextResponse("You've been unsubscribed from Kelowna Daily Specials outreach emails.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
