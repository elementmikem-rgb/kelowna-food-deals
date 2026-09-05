import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues, specials, events, menuItems, submissions } from "@/db";
import { eq } from "drizzle-orm";
import { reviewSubmission, AUTO_APPROVE_CONFIDENCE } from "@/lib/submission-review";
import { savePhotoOnApproval } from "@/lib/venue-photos";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4MB, before base64 overhead
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const submitSchema = z.object({
  venueId: z.number().int().positive(),
  text: z.string().max(2000).nullable(),
  photoBase64: z.string().nullable(),
  photoMimeType: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }
  const { venueId, text, photoBase64, photoMimeType } = parsed.data;

  if (!text && !photoBase64) {
    return NextResponse.json({ error: "provide a description or a photo" }, { status: 400 });
  }
  if (photoBase64) {
    if (!photoMimeType || !ALLOWED_MIME.includes(photoMimeType)) {
      return NextResponse.json({ error: "unsupported photo type" }, { status: 400 });
    }
    const approxBytes = (photoBase64.length * 3) / 4;
    if (approxBytes > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "photo too large (max 4MB)" }, { status: 400 });
    }
  }

  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    return NextResponse.json({ error: "unknown venue" }, { status: 400 });
  }

  try {
    const { result } = await reviewSubmission(text, photoBase64, photoMimeType);
    const now = new Date();
    const resolvedItemKeys: string[] = [];
    let autoApprovedCount = 0;

    for (let i = 0; i < result.specials.length; i++) {
      const s = result.specials[i];
      if (s.confidence >= AUTO_APPROVE_CONFIDENCE) {
        await db.insert(specials).values({
          venueId,
          title: s.title,
          description: s.description,
          priceCents: s.price_cents,
          dayOfWeek: s.day_of_week,
          isMonthly: s.is_monthly,
          startTime: s.start_time,
          endTime: s.end_time,
          category: s.category,
          lastVerifiedAt: now,
          sourceUrl: null,
          confidence: s.confidence,
          extractionNotes: "Submitted by a visitor, AI-verified.",
        });
        resolvedItemKeys.push(`special:${i}`);
        autoApprovedCount++;
      }
    }

    for (let i = 0; i < result.events.length; i++) {
      const e = result.events[i];
      if (e.confidence >= AUTO_APPROVE_CONFIDENCE && (e.day_of_week !== null || e.specific_date !== null)) {
        await db.insert(events).values({
          venueId,
          title: e.title,
          description: e.description,
          eventType: e.event_type,
          dayOfWeek: e.day_of_week,
          specificDate: e.specific_date,
          startTime: e.start_time,
          endTime: e.end_time,
          coverChargeCents: e.cover_charge_cents,
          lastVerifiedAt: now,
          sourceUrl: null,
          confidence: e.confidence,
          extractionNotes: "Submitted by a visitor, AI-verified.",
        });
        resolvedItemKeys.push(`event:${i}`);
        autoApprovedCount++;
      }
    }

    for (let i = 0; i < result.menu_items.length; i++) {
      const m = result.menu_items[i];
      if (m.confidence >= AUTO_APPROVE_CONFIDENCE) {
        await db.insert(menuItems).values({
          venueId,
          name: m.name,
          description: m.description,
          priceCents: m.price_cents,
          lastVerifiedAt: now,
          sourceUrl: null,
          confidence: m.confidence,
          extractionNotes: "Submitted by a visitor, AI-verified.",
        });
        resolvedItemKeys.push(`menuItem:${i}`);
        autoApprovedCount++;
      }
    }

    const totalItems = result.specials.length + result.events.length + result.menu_items.length;
    const pendingCount = totalItems - autoApprovedCount;
    const status = totalItems === 0 ? "rejected" : pendingCount > 0 ? "needs_review" : "auto_approved";

    const [savedSubmission] = await db
      .insert(submissions)
      .values({
        venueId,
        rawText: text,
        photoData: photoBase64,
        photoMimeType,
        status,
        aiExtracted: result,
        aiConfidence: null,
        aiNotes:
          totalItems === 0
            ? "No qualifying specials, events, or menu items found."
            : `${autoApprovedCount} auto-published, ${pendingCount} pending review.`,
        resolvedItemKeys,
        reviewedAt: pendingCount === 0 ? now : null,
      })
      .returning({ id: submissions.id });

    if (photoBase64 && photoMimeType && autoApprovedCount > 0) {
      await savePhotoOnApproval({
        venueId,
        photoData: photoBase64,
        photoMimeType,
        submissionId: savedSubmission.id,
      });
    }

    return NextResponse.json({
      status,
      autoApprovedCount,
      pendingCount,
      totalItems,
    });
  } catch (err) {
    console.error("Submission review failed:", err);
    // Never drop a real submission just because AI review errored — queue it for manual review.
    await db.insert(submissions).values({
      venueId,
      rawText: text,
      photoData: photoBase64,
      photoMimeType,
      status: "needs_review",
      aiExtracted: null,
      aiConfidence: null,
      aiNotes: `AI review failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return NextResponse.json({ status: "needs_review", autoApprovedCount: 0, pendingCount: 1, totalItems: 1 });
  }
}
