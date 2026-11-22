import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, emailAttachments, inboundEmails, venuePhotos, venues } from "@/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isSafeImageMimeType } from "@/lib/safe-image-types";
import { prepareVenuePhoto } from "@/lib/venue-photo-prep";

// Adds an image a venue emailed us to that venue's public listing (venue_photos, source "owner", which ranks
// first on the listing). Runs only when the admin clicks the button in the thread view.
const bodySchema = z.object({
  venueId: z.number().int().positive(),
  mode: z.enum(["photo", "logo"]),
});

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const attachmentId = Number(id);
  if (!Number.isInteger(attachmentId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { venueId, mode } = parsed.data;

  // The file must be an attachment on a message that came from THIS venue's thread, so a crafted request can
  // never put an unrelated email's image on a listing.
  const [row] = await db
    .select({
      fileData: emailAttachments.fileData,
      contentType: emailAttachments.contentType,
      sizeBytes: emailAttachments.sizeBytes,
      messageVenueId: inboundEmails.venueId,
    })
    .from(emailAttachments)
    .innerJoin(inboundEmails, eq(emailAttachments.inboundEmailId, inboundEmails.id))
    .where(eq(emailAttachments.id, attachmentId))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.messageVenueId !== venueId) return NextResponse.json({ error: "attachment is not from this venue" }, { status: 403 });
  if (!isSafeImageMimeType(row.contentType)) return NextResponse.json({ error: "not a supported image" }, { status: 415 });
  if (row.sizeBytes > MAX_SOURCE_BYTES) return NextResponse.json({ error: "image is too large" }, { status: 413 });

  const [venue] = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) return NextResponse.json({ error: "venue not found" }, { status: 404 });

  let prepared;
  try {
    prepared = await prepareVenuePhoto(Buffer.from(row.fileData, "base64"), mode);
  } catch {
    return NextResponse.json({ error: "could not read the image" }, { status: 422 });
  }
  const photoData = prepared.data.toString("base64");

  // Same image already on the listing (clicked twice, or added before): do nothing.
  const digest = createHash("md5").update(photoData).digest("hex");
  const [dupe] = await db
    .select({ id: venuePhotos.id })
    .from(venuePhotos)
    .where(and(eq(venuePhotos.venueId, venueId), sql`md5(${venuePhotos.photoData}) = ${digest}`))
    .limit(1);
  if (dupe) return NextResponse.json({ ok: true, alreadyThere: true, id: dupe.id });

  const [created] = await db
    .insert(venuePhotos)
    .values({
      venueId,
      photoData,
      photoMimeType: prepared.mimeType,
      caption: mode === "logo" ? `${venue.name} logo` : `${venue.name} photo`,
      source: "owner",
    })
    .returning({ id: venuePhotos.id });

  return NextResponse.json({ ok: true, alreadyThere: false, id: created.id });
}
