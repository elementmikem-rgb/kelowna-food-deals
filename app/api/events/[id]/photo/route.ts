import { NextRequest, NextResponse } from "next/server";
import { db, events } from "@/db";
import { eq } from "drizzle-orm";
import { isPromotionActive } from "@/lib/promotion";
import { isSafeImageMimeType } from "@/lib/safe-image-types";

// Mirrors app/api/specials/[id]/photo/route.ts -- see its comment.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [event] = await db
    .select({ photoData: events.photoData, photoMimeType: events.photoMimeType, boostedUntil: events.boostedUntil })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event || !event.photoData || !event.photoMimeType || !isPromotionActive(event.boostedUntil)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // Defensive re-check even though verify-email/route.ts already enforces this at
  // upload time -- catches any row that predates that check. See safe-image-types.ts.
  if (!isSafeImageMimeType(event.photoMimeType)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buffer = Buffer.from(event.photoData, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": event.photoMimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=300",
    },
  });
}
