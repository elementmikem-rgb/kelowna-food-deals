import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venuePhotos } from "@/db";
import { getOwnerSession } from "@/lib/venue-owner-auth";
import { isSafeImageMimeType } from "@/lib/safe-image-types";

// Same pre-base64 ceiling as app/api/bookings/verify-email/route.ts's photo add-on --
// the client already downscales through lib/client-image.ts's fileToBase64, so a
// legitimate upload should never be near this; it's a backstop against a crafted request.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const bodySchema = z.object({
  venueId: z.number().int().positive(),
  photoData: z.string().min(1),
  photoMimeType: z.string(),
});

// Inserts straight into venue_photos with submissionId: null -- the same table visitor
// submissions write to (see db/schema.ts's venue_photos comment and lib/data.ts's
// venuePhotoId subquery, which already picks the most recently created row for every
// specials-board card and the venue detail page's full gallery). An owner's own upload
// needs no new display plumbing: it becomes the new "most recent" and shows up
// everywhere a venue photo already renders, the moment this insert commits.
export async function POST(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }
  const { venueId, photoData, photoMimeType } = parsed.data;
  if (!session.venueIds.includes(venueId)) {
    return NextResponse.json({ error: "not your venue" }, { status: 403 });
  }

  if (!isSafeImageMimeType(photoMimeType)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  // Rough pre-decode size check (base64 runs ~4/3 the size of the original bytes).
  const approxBytes = (photoData.length * 3) / 4;
  if (approxBytes > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo is too large" }, { status: 400 });
  }

  const [created] = await db
    .insert(venuePhotos)
    .values({ venueId, photoData, photoMimeType })
    .returning({ id: venuePhotos.id });

  return NextResponse.json({ ok: true, id: created.id });
}
