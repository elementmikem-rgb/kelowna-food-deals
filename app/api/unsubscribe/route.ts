import { NextRequest, NextResponse } from "next/server";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

// GET serves the footer link a person clicks. POST serves RFC 8058 one-click
// unsubscribe: the outreach emails send "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
// so a mailbox provider's native Unsubscribe button POSTs to this same URL (token and
// venueId stay in the query string; the form body carries nothing we need).
export async function GET(req: NextRequest) {
  return unsubscribe(req);
}

export async function POST(req: NextRequest) {
  return unsubscribe(req);
}

async function unsubscribe(req: NextRequest) {
  const venueId = Number(req.nextUrl.searchParams.get("venueId"));
  const token = req.nextUrl.searchParams.get("token");

  if (!Number.isInteger(venueId) || !token || !verifyUnsubscribeToken(venueId, token)) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 });
  }

  await db.update(venues).set({ unsubscribedAt: new Date() }).where(eq(venues.id, venueId));

  return new NextResponse("You've been unsubscribed from Kelowna Food Deals outreach emails.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
