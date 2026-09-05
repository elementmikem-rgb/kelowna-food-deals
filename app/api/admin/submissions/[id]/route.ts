import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, submissions, specials, events } from "@/db";
import { eq } from "drizzle-orm";
import type { SpecialReviewResult, EventReviewResult } from "@/lib/submission-review";
import { savePhotoOnApproval } from "@/lib/venue-photos";

const actionSchema = z.object({ action: z.enum(["approve", "reject"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (submission.status !== "needs_review") {
    return NextResponse.json({ error: "already reviewed" }, { status: 409 });
  }

  const now = new Date();

  if (parsed.data.action === "reject") {
    await db
      .update(submissions)
      .set({ status: "rejected", reviewedAt: now })
      .where(eq(submissions.id, submissionId));
    return NextResponse.json({ ok: true });
  }

  if (!submission.aiExtracted) {
    return NextResponse.json({ error: "no extracted data to approve" }, { status: 400 });
  }

  let resultingRowId: number;
  if (submission.submissionType === "special") {
    const result = submission.aiExtracted as SpecialReviewResult;
    if (!result.title) {
      return NextResponse.json({ error: "missing title" }, { status: 400 });
    }
    const [inserted] = await db
      .insert(specials)
      .values({
        venueId: submission.venueId,
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
        extractionNotes: "Submitted by a visitor, approved by admin.",
      })
      .returning({ id: specials.id });
    resultingRowId = inserted.id;
  } else {
    const result = submission.aiExtracted as EventReviewResult;
    if (!result.title) {
      return NextResponse.json({ error: "missing title" }, { status: 400 });
    }
    const [inserted] = await db
      .insert(events)
      .values({
        venueId: submission.venueId,
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
        extractionNotes: "Submitted by a visitor, approved by admin.",
      })
      .returning({ id: events.id });
    resultingRowId = inserted.id;
  }

  await db
    .update(submissions)
    .set({ status: "approved", reviewedAt: now, resultingRowId })
    .where(eq(submissions.id, submissionId));

  await savePhotoOnApproval({
    venueId: submission.venueId,
    photoData: submission.photoData,
    photoMimeType: submission.photoMimeType,
    submissionId: submission.id,
  });

  return NextResponse.json({ ok: true });
}
