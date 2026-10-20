import { NextRequest, NextResponse } from "next/server";
import { db, venuePhotos } from "@/db";
import { eq } from "drizzle-orm";

const THUMB_WIDTHS = [160, 320];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [photo] = await db
    .select({ photoData: venuePhotos.photoData, photoMimeType: venuePhotos.photoMimeType })
    .from(venuePhotos)
    .where(eq(venuePhotos.id, photoId))
    .limit(1);

  if (!photo) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buffer = Buffer.from(photo.photoData, "base64");

  // ?w=<160|320> returns a small JPEG thumbnail, for the map's venue cards -- the stored
  // photos are ~500KB each and a card only shows them at about 80px. Any failure falls
  // through to the original image.
  const w = Number(req.nextUrl.searchParams.get("w"));
  if (THUMB_WIDTHS.includes(w)) {
    try {
      const { default: sharp } = await import("sharp");
      const thumb = await sharp(buffer).rotate().resize({ width: w, withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
      return new NextResponse(new Uint8Array(thumb), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    } catch {
      // fall through to the full-size image below
    }
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": photo.photoMimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
