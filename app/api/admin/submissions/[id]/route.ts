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
  if (!(await isAdminAuthed(req))) {
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

  const now = new Date();

  // The row lock is acquired FIRST, before any insert, and every check (status, duplicate
  // item, extracted data present) is re-verified against the locked row -- not the earlier
  // unlocked select -- so two near-simultaneous requests for the same item can't both pass
  // validation and both publish, and can't both append the same key to resolvedItemKeys.
  const outcome = await db.transaction(async (tx) => {
    const [submission] = await tx
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .for("update");
    if (!submission) {
      return { error: "not found" as const, status: 404 };
    }
    if (submission.status !== "needs_review") {
      return { error: "submission already fully resolved" as const, status: 409 };
    }
    if (submission.resolvedItemKeys.includes(baseKey) || submission.resolvedItemKeys.includes(`rejected:${baseKey}`)) {
      return { error: "item already resolved" as const, status: 409 };
    }
    if (!submission.aiExtracted) {
      return { error: "no extracted data" as const, status: 400 };
    }

    const extracted = submission.aiExtracted as SubmissionReviewResult;

    if (action === "approve") {
      if (itemType === "special") {
        const s = extracted.specials[itemIndex];
        if (!s) return { error: "item not found" as const, status: 400 };
        await tx.insert(specials).values({
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
        if (!e) return { error: "item not found" as const, status: 400 };
        if (e.day_of_week === null && e.specific_date === null) {
          // Mirrors the gate app/api/submit/route.ts applies on the auto-approve path --
          // without it, an admin-approved event could publish with neither a recurring day
          // nor a one-off date, which every renderer assumes can't happen.
          return { error: "event has no day or date" as const, status: 400 };
        }
        await tx.insert(events).values({
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
        if (!m) return { error: "item not found" as const, status: 400 };
        await tx.insert(menuItems).values({
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
    }

    const totalItems =
      extracted.specials.length + extracted.events.length + extracted.menu_items.length;
    const updatedKeys = [...submission.resolvedItemKeys, itemKey];
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

    return {
      ok: true as const,
      fullyResolved: resolved,
      venueId: submission.venueId,
      photoData: submission.photoData,
      photoMimeType: submission.photoMimeType,
    };
  });

  if (outcome.ok !== true) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  if (action === "approve") {
    const [existingPhoto] = await db
      .select({ id: venuePhotos.id })
      .from(venuePhotos)
      .where(and(eq(venuePhotos.submissionId, submissionId)))
      .limit(1);
    if (!existingPhoto) {
      await savePhotoOnApproval({
        venueId: outcome.venueId,
        photoData: outcome.photoData,
        photoMimeType: outcome.photoMimeType,
        submissionId,
      });
    }
  }

  return NextResponse.json({ ok: true, fullyResolved: outcome.fullyResolved });
}
