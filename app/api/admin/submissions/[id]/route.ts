import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, submissions, specials, events, menuItems, venuePhotos } from "@/db";
import { eq, and } from "drizzle-orm";
import type { SubmissionReviewResult } from "@/lib/submission-review";
import { savePhotoOnApproval } from "@/lib/venue-photos";
import { isAdminAuthed } from "@/lib/admin-auth";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  itemType: z.enum(["special", "event", "menuItem"]),
  itemIndex: z.number().int().nonnegative(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
  const { action, itemType, itemIndex } = parsed.data;
  const baseKey = `${itemType}:${itemIndex}`;
  // Reject is recorded with a distinct prefix (rather than a bare "approve" always winning
  // the ambiguity) so a submission where every item was rejected doesn't read back as
  // indistinguishable from one where every item was approved.
  const itemKey = action === "reject" ? `rejected:${baseKey}` : baseKey;

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (submission.status !== "needs_review") {
    return NextResponse.json({ error: "submission already fully resolved" }, { status: 409 });
  }
  if (submission.resolvedItemKeys.includes(baseKey) || submission.resolvedItemKeys.includes(`rejected:${baseKey}`)) {
    return NextResponse.json({ error: "item already resolved" }, { status: 409 });
  }
  if (!submission.aiExtracted) {
    return NextResponse.json({ error: "no extracted data" }, { status: 400 });
  }

  const now = new Date();
  const extracted = submission.aiExtracted as SubmissionReviewResult;

  if (action === "approve") {
    if (itemType === "special") {
      const s = extracted.specials[itemIndex];
      if (!s) return NextResponse.json({ error: "item not found" }, { status: 400 });
      await db.insert(specials).values({
        venueId: submission.venueId,
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
        extractionNotes: "Submitted by a visitor, approved by admin.",
      });
    } else if (itemType === "event") {
      const e = extracted.events[itemIndex];
      if (!e) return NextResponse.json({ error: "item not found" }, { status: 400 });
      await db.insert(events).values({
        venueId: submission.venueId,
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
        extractionNotes: "Submitted by a visitor, approved by admin.",
      });
    } else {
      const m = extracted.menu_items[itemIndex];
      if (!m) return NextResponse.json({ error: "item not found" }, { status: 400 });
      await db.insert(menuItems).values({
        venueId: submission.venueId,
        name: m.name,
        description: m.description,
        priceCents: m.price_cents,
        lastVerifiedAt: now,
        sourceUrl: null,
        confidence: m.confidence,
        extractionNotes: "Submitted by a visitor, approved by admin.",
      });
    }

    const [existingPhoto] = await db
      .select({ id: venuePhotos.id })
      .from(venuePhotos)
      .where(and(eq(venuePhotos.submissionId, submission.id)))
      .limit(1);
    if (!existingPhoto) {
      await savePhotoOnApproval({
        venueId: submission.venueId,
        photoData: submission.photoData,
        photoMimeType: submission.photoMimeType,
        submissionId: submission.id,
      });
    }
  }

  const totalItems =
    extracted.specials.length + extracted.events.length + extracted.menu_items.length;

  // Re-read under a row lock so two near-simultaneous approve/reject calls on the same
  // submission can't both read the same resolvedItemKeys snapshot and overwrite each other.
  const fullyResolved = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ resolvedItemKeys: submissions.resolvedItemKeys })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .for("update");
    const updatedKeys = [...(locked?.resolvedItemKeys ?? submission.resolvedItemKeys), itemKey];
    const resolved = updatedKeys.length >= totalItems;
    const anyApproved = updatedKeys.some((k) => !k.startsWith("rejected:"));
    await tx
      .update(submissions)
      .set({
        resolvedItemKeys: updatedKeys,
        status: resolved ? (anyApproved ? "approved" : "rejected") : "needs_review",
        reviewedAt: resolved ? now : null,
      })
      .where(eq(submissions.id, submissionId));
    return resolved;
  });

  return NextResponse.json({ ok: true, fullyResolved });
}
