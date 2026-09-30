import { NextRequest, NextResponse } from "next/server";
import { db, venueOwners } from "@/db";
import { eq } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";

export async function POST(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await db
    .update(venueOwners)
    .set({ onboardingSeenAt: new Date() })
    .where(eq(venueOwners.id, session.venueOwnerId));

  return NextResponse.json({ ok: true });
}
