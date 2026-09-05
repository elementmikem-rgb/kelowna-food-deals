import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues, specials, events, submissions } from "@/db";
import { eq } from "drizzle-orm";
import {
  reviewSpecialSubmission,
  reviewEventSubmission,
  AUTO_APPROVE_CONFIDENCE,
} from "@/lib/submission-review";
import { savePhotoOnApproval } from "@/lib/venue-photos";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4MB, before base64 overhead
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const submitSchema = z.object({
  venueId: z.number().int().positive(),
  submissionType: z.enum(["special", "event"]),
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
  const { venueId, submissionType, text, photoBase64, photoMimeType } = parsed.data;

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
    if (submissionType === "special") {
      const { result, tokensUsed: _tokensUsed } = await reviewSpecialSubmission(
        text,
        photoBase64,
        photoMimeType
      );

      if (result.qualifies && result.confidence >= AUTO_APPROVE_CONFIDENCE && result.title) {
        const now = new Date();
        const [inserted] = await db
          .insert(specials)
          .values({
            venueId,
            title: result.title,
            description: result.description,
            priceCents: result.price_cents,
            dayOfWeek: result.day_of_week,
            isMonthly: result.is_monthly ?? false,
            startTime: result.start_time,
            endTime: result.end_time,
            category: result.category ?? "other",
            lastVerifiedAt: now,
            sourceUrl: null,
            confidence: result.confidence,
            extractionNotes: "Submitted by a visitor, AI-verified.",
          })
          .returning({ id: specials.id });

        const [savedSubmission] = await db
          .insert(submissions)
          .values({
            venueId,
            submissionType,
            rawText: text,
            photoData: photoBase64,
            photoMimeType,
            status: "auto_approved",
            aiExtracted: result,
            aiConfidence: result.confidence,
            aiNotes: result.notes,
            resultingRowId: inserted.id,
            reviewedAt: now,
          })
          .returning({ id: submissions.id });

        await savePhotoOnApproval({
          venueId,
          photoData: photoBase64,
          photoMimeType,
          submissionId: savedSubmission.id,
        });

        return NextResponse.json({ status: "auto_approved" });
      }

      await db.insert(submissions).values({
        venueId,
        submissionType,
        rawText: text,
        photoData: photoBase64,
        photoMimeType,
        status: "needs_review",
        aiExtracted: result,
        aiConfidence: result.confidence,
        aiNotes: result.notes,
      });
      return NextResponse.json({ status: "needs_review" });
    } else {
      const { result, tokensUsed: _tokensUsed } = await reviewEventSubmission(
        text,
        photoBase64,
        photoMimeType
      );

      if (
        result.qualifies &&
        result.confidence >= AUTO_APPROVE_CONFIDENCE &&
        result.title &&
        (result.day_of_week !== null || result.specific_date !== null)
      ) {
        const now = new Date();
        const [inserted] = await db
          .insert(events)
          .values({
            venueId,
            title: result.title,
            description: result.description,
            eventType: result.event_type ?? "other",
            dayOfWeek: result.day_of_week,
            specificDate: result.specific_date,
            startTime: result.start_time,
            endTime: result.end_time,
            coverChargeCents: result.cover_charge_cents,
            lastVerifiedAt: now,
            sourceUrl: null,
            confidence: result.confidence,
            extractionNotes: "Submitted by a visitor, AI-verified.",
          })
          .returning({ id: events.id });

        const [savedSubmission] = await db
          .insert(submissions)
          .values({
            venueId,
            submissionType,
            rawText: text,
            photoData: photoBase64,
            photoMimeType,
            status: "auto_approved",
            aiExtracted: result,
            aiConfidence: result.confidence,
            aiNotes: result.notes,
            resultingRowId: inserted.id,
            reviewedAt: now,
          })
          .returning({ id: submissions.id });

        await savePhotoOnApproval({
          venueId,
          photoData: photoBase64,
          photoMimeType,
          submissionId: savedSubmission.id,
        });

        return NextResponse.json({ status: "auto_approved" });
      }

      await db.insert(submissions).values({
        venueId,
        submissionType,
        rawText: text,
        photoData: photoBase64,
        photoMimeType,
        status: "needs_review",
        aiExtracted: result,
        aiConfidence: result.confidence,
        aiNotes: result.notes,
      });
      return NextResponse.json({ status: "needs_review" });
    }
  } catch (err) {
    console.error("Submission review failed:", err);
    // Never drop a real submission just because AI review errored — queue it for manual review.
    await db.insert(submissions).values({
      venueId,
      submissionType,
      rawText: text,
      photoData: photoBase64,
      photoMimeType,
      status: "needs_review",
      aiExtracted: null,
      aiConfidence: null,
      aiNotes: `AI review failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return NextResponse.json({ status: "needs_review" });
  }
}
