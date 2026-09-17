import { NextRequest, NextResponse } from "next/server";
import { db, specials } from "@/db";
import { eq } from "drizzle-orm";
import { isPromotionActive } from "@/lib/promotion";
import { isSafeImageMimeType } from "@/lib/safe-image-types";

// Mirrors app/api/venue-photos/[id]/route.ts's response shape. Only ever serves the
// photo while the special is actively boosted -- see specials.photoData's schema
// comment: the paid photo add-on is meant to lapse alongside the boost itself, with no
// separate expiry tracking needed.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [special] = await db
    .select({ photoData: specials.photoData, photoMimeType: specials.photoMimeType, boostedUntil: specials.boostedUntil })
    .from(specials)
    .where(eq(specials.id, specialId))
    .limit(1);

  if (!special || !special.photoData || !special.photoMimeType || !isPromotionActive(special.boostedUntil)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // Defensive re-check even though verify-email/route.ts already enforces this at
  // upload time -- catches any row that predates that check. See safe-image-types.ts.
  if (!isSafeImageMimeType(special.photoMimeType)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buffer = Buffer.from(special.photoData, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": special.photoMimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // Short cache, unlike venue-photos' immutable one -- this image can disappear
      // (boost lapses) without the underlying id ever changing.
      "Cache-Control": "private, max-age=300",
    },
  });
}
