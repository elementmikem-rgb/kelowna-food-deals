import { NextRequest, NextResponse } from "next/server";
import { db, venuePhotos } from "@/db";
import { eq } from "drizzle-orm";

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
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": photo.photoMimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
