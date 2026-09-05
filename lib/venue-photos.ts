import { db, venuePhotos } from "@/db";
import { desc, eq, inArray } from "drizzle-orm";

const MAX_PHOTOS_PER_VENUE = 12;

export async function savePhotoOnApproval(params: {
  venueId: number;
  photoData: string | null;
  photoMimeType: string | null;
  submissionId: number | null;
}) {
  const { venueId, photoData, photoMimeType, submissionId } = params;
  if (!photoData || !photoMimeType) return;

  await db.insert(venuePhotos).values({
    venueId,
    photoData,
    photoMimeType,
    submissionId,
  });

  // Keep only the most recent N photos per venue so the table doesn't grow unbounded.
  const rows = await db
    .select({ id: venuePhotos.id })
    .from(venuePhotos)
    .where(eq(venuePhotos.venueId, venueId))
    .orderBy(desc(venuePhotos.createdAt));
  const stale = rows.slice(MAX_PHOTOS_PER_VENUE).map((r) => r.id);
  if (stale.length > 0) {
    await db.delete(venuePhotos).where(inArray(venuePhotos.id, stale));
  }
}
