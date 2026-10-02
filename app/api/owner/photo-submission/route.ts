import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, submissions, venues } from "@/db";
import { eq } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";
import { isSafeImageMimeType } from "@/lib/safe-image-types";

// Same pre-base64 ceiling as the other owner photo upload (app/api/owner/venue-photo/
// route.ts) and the public submit flow's own check.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const bodySchema = z.object({
  venueId: z.number().int().positive(),
  // What this photo is for, e.g. `Wing Night (special)` or `Trivia Night (event)` --
  // shown as the submission's rawText so an admin reviewing it has context, same as a
  // visitor's own submitted note would show.
  note: z.string().trim().min(1).max(200),
  photoData: z.string().min(1),
  photoMimeType: z.string(),
});

// A venue's own verified owner attaching a photo to a special/event they already
// created through their dashboard (POST /api/owner/specials or /events, both already
// live immediately -- see those routes). Unlike the cover-photo uploader
// (app/api/owner/venue-photo/route.ts), this does NOT go live immediately: it lands in
// the same admin review queue (specials.submissions) a visitor's own /submit photo
// does, via the "Approve photo" action (app/api/admin/submissions/[id]/route.ts) --
// deliberately, since a special/event's photo is more visible/permanent than the
// general cover photo and the owner just asked for it to "go to the admin".
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
  const { venueId, note, photoData, photoMimeType } = parsed.data;
  if (!session.venueIds.includes(venueId)) {
    return NextResponse.json({ error: "not your venue" }, { status: 403 });
  }

  if (!isSafeImageMimeType(photoMimeType)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  const approxBytes = (photoData.length * 3) / 4;
  if (approxBytes > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo is too large" }, { status: 400 });
  }

  const [venue] = await db.select({ regionId: venues.regionId }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    return NextResponse.json({ error: "venue not found" }, { status: 400 });
  }

  await db.insert(submissions).values({
    venueId,
    regionId: venue.regionId,
    rawText: `From the venue's own dashboard -- ${note}`,
    photoData,
    photoMimeType,
    status: "needs_review",
    // Deliberately left null -- no free text to run AI extraction against, see this
    // route's own comment. The admin review UI's "Approve photo" action handles a
    // known-venue, no-extraction submission like this one.
    aiExtracted: null,
  });

  return NextResponse.json({ ok: true });
}
