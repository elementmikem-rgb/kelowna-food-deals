import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues, specials, events, menuItems, submissions } from "@/db";
import { eq } from "drizzle-orm";
import { reviewSubmission, AUTO_APPROVE_CONFIDENCE } from "@/lib/submission-review";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { specialMatchesArchived, eventMatchesArchived } from "@/lib/archived-match";
import { getRegionBySlug } from "@/lib/regions";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4MB, before base64 overhead
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validTimeOrNull(v: string | null): string | null {
  return v && TIME_RE.test(v) ? v : null;
}
function validDateOrNull(v: string | null): string | null {
  return v && DATE_RE.test(v) ? v : null;
}

const submitSchema = z
  .object({
    venueId: z.number().int().positive().nullable(),
    venueName: z.string().trim().min(1).max(200).nullable(),
    venueAddress: z.string().trim().min(1).max(300).nullable(),
    text: z.string().max(2000).nullable(),
    photoBase64: z.string().nullable(),
    photoMimeType: z.string().nullable(),
    // The photo's own EXIF capture date (client-extracted, before the canvas resize
    // strips it) -- a far more reliable "today" for resolving a day-only date on the
    // photo (e.g. a chalkboard's "the 18th") than the moment this request happens to
    // reach the server, since a submitter can attach an older photo from their camera
    // roll days after actually taking it. Optional: many phones/screenshots have no
    // EXIF at all, and there's no photo to have one when this is a text-only submission.
    photoCapturedDate: z
      .string()
      .regex(DATE_RE)
      .nullable()
      .optional(),
    // The region the submitter's /submit page belongs to. Only load-bearing for a
    // brand-new venue (an existing venue's own regionId is used instead), but every
    // submission stores it so the row is never ambiguous about where it came from.
    regionSlug: z.string().trim().min(1).max(100),
  })
  .refine((v) => (v.venueId !== null) !== (v.venueName !== null), {
    message: "provide either an existing venueId or a new venueName, not both or neither",
  })
  .refine((v) => v.venueName === null || v.venueAddress !== null, {
    message: "address is required for a new venue",
  });

export async function POST(req: NextRequest) {
  // Each request costs a real Claude vision call plus a permanent DB row storing the
  // full photo, so this endpoint needs its own ceiling separate from the AI cost cap.
  const { ok: withinLimit } = await checkRateLimit(req, "submit", 5, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many submissions, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }
  const { venueId, venueName, venueAddress, text, photoBase64, photoMimeType, photoCapturedDate, regionSlug } =
    parsed.data;
  const isNewVenue = venueId === null;

  const submittedRegion = await getRegionBySlug(regionSlug);
  if (!submittedRegion) {
    return NextResponse.json({ error: "unknown region" }, { status: 400 });
  }

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

  let venueRegionId: number | null = null;
  if (!isNewVenue) {
    const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
    if (!venue) {
      return NextResponse.json({ error: "unknown venue" }, { status: 400 });
    }
    venueRegionId = venue.regionId;
  }

  try {
    const { result } = await reviewSubmission(text, photoBase64, photoMimeType, photoCapturedDate ?? null);
    const now = new Date();
    const resolvedItemKeys: string[] = [];
    let autoApprovedCount = 0;
    let autoRejectedCount = 0;

    // A venue that doesn't exist yet has nothing to attach specials/events/menu items
    // to -- every item stays queued for an admin, who creates the real venue row the
    // first time they approve one (see app/api/admin/submissions/[id]/route.ts).
    if (!isNewVenue) {
      // venueRegionId is guaranteed non-null here: it's set right after the venue lookup
      // above, on the same `!isNewVenue` branch we're inside now.
      const regionId = venueRegionId!;

      // Checked before the transaction below (a plain read, not part of it -- this
      // only ever reads rows a human already committed via the flagged-review queue,
      // so a read outside the transaction can't race with anything this request
      // itself writes). A visitor's photo/text can independently rediscover the same
      // stale claim a manually archived row was already rejected for (e.g. an old
      // Facebook/Instagram post the venue never took down) -- auto-approving it here
      // would recreate exactly what an admin already reviewed and rejected, the same
      // failure cron/upsert.ts's replaceVenueSpecials/replaceVenueEvents guard against.
      const suppressedSpecialIndices = new Set<number>();
      for (let i = 0; i < result.specials.length; i++) {
        const s = result.specials[i];
        if (
          s.confidence >= AUTO_APPROVE_CONFIDENCE &&
          (await specialMatchesArchived(venueId!, {
            title: s.title,
            description: s.description,
            priceCents: s.price_cents,
            dayOfWeek: s.day_of_week,
            isMonthly: s.is_monthly,
            startTime: validTimeOrNull(s.start_time),
            endTime: validTimeOrNull(s.end_time),
            category: s.category,
          }))
        ) {
          suppressedSpecialIndices.add(i);
        }
      }
      const suppressedEventIndices = new Set<number>();
      for (let i = 0; i < result.events.length; i++) {
        const e = result.events[i];
        if (
          e.confidence >= AUTO_APPROVE_CONFIDENCE &&
          (e.day_of_week !== null || e.specific_date !== null) &&
          (await eventMatchesArchived(venueId!, {
            title: e.title,
            description: e.description,
            eventType: e.event_type,
            dayOfWeek: e.day_of_week,
            specificDate: validDateOrNull(e.specific_date),
            startTime: validTimeOrNull(e.start_time),
            endTime: validTimeOrNull(e.end_time),
            coverChargeCents: e.cover_charge_cents,
          }))
        ) {
          suppressedEventIndices.add(i);
        }
      }

      // Wrapped in one transaction: previously a mid-loop insert failure (e.g. a bad
      // date/time string) could leave some items already published live while the
      // submissions bookkeeping row never got written, permanently orphaning them.
      await db.transaction(async (tx) => {
        for (let i = 0; i < result.specials.length; i++) {
          const s = result.specials[i];
          if (suppressedSpecialIndices.has(i)) {
            resolvedItemKeys.push(`rejected:special:${i}`);
            autoRejectedCount++;
          } else if (s.confidence >= AUTO_APPROVE_CONFIDENCE) {
            await tx.insert(specials).values({
              venueId,
              regionId,
              title: s.title,
              description: s.description,
              priceCents: s.price_cents,
              dayOfWeek: s.day_of_week,
              isMonthly: s.is_monthly,
              startTime: validTimeOrNull(s.start_time),
              endTime: validTimeOrNull(s.end_time),
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
          if (suppressedEventIndices.has(i)) {
            resolvedItemKeys.push(`rejected:event:${i}`);
            autoRejectedCount++;
          } else if (
            e.confidence >= AUTO_APPROVE_CONFIDENCE &&
            (e.day_of_week !== null || e.specific_date !== null)
          ) {
            await tx.insert(events).values({
              venueId,
              regionId,
              title: e.title,
              description: e.description,
              eventType: e.event_type,
              dayOfWeek: e.day_of_week,
              specificDate: validDateOrNull(e.specific_date),
              startTime: validTimeOrNull(e.start_time),
              endTime: validTimeOrNull(e.end_time),
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
            await tx.insert(menuItems).values({
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
      });
    }

    const totalItems = result.specials.length + result.events.length + result.menu_items.length;
    const pendingCount = totalItems - autoApprovedCount - autoRejectedCount;
    const hasPhoto = !!(photoBase64 && photoMimeType);
    // A photo is never auto-published as a venue photo here regardless of text confidence --
    // it only gets attached via the admin approve action (app/api/admin/submissions/[id]/route.ts).
    // But that's a reason to hold back the PHOTO, not the whole submission: when every extracted
    // item already resolved (auto-approved or auto-rejected) there's nothing left an admin can
    // act on via the per-item approve/reject buttons, so forcing needs_review here left the
    // submission permanently stuck open with no way to close it (AdminSubmissionRow already
    // hides it once `remaining <= 0`, so the photo was never actually getting reviewed anyway --
    // this just left the badge/count wrong forever). Only fall back to needs_review for the
    // photo's sake when there are no structured items at all for a human to fall back on.
    // A new venue is never auto-published either -- there's no venue row yet to attach to.
    const status =
      totalItems === 0
        ? hasPhoto
          ? "needs_review"
          : "rejected"
        : isNewVenue || pendingCount > 0
          ? "needs_review"
          : "auto_approved";

    await db.insert(submissions).values({
      venueId,
      venueName: isNewVenue ? venueName : null,
      venueAddress: isNewVenue ? venueAddress : null,
      regionId: submittedRegion.id,
      rawText: text,
      photoData: photoBase64,
      photoMimeType,
      status,
      aiExtracted: result,
      aiConfidence: null,
      aiNotes: isNewVenue
        ? `New venue "${venueName}" -- needs an admin to create the venue record before anything can publish.`
        : totalItems === 0
          ? "No qualifying specials, events, or menu items found."
          : `${autoApprovedCount} auto-published, ${pendingCount} pending review.`,
      resolvedItemKeys: isNewVenue ? [] : resolvedItemKeys,
      reviewedAt: status === "needs_review" ? null : now,
    });

    return NextResponse.json({
      status,
      autoApprovedCount: isNewVenue ? 0 : autoApprovedCount,
      pendingCount: isNewVenue ? totalItems : pendingCount,
      totalItems,
    });
  } catch (err) {
    console.error("Submission review failed:", err);
    // Never drop a real submission just because AI review errored — queue it for manual review.
    await db.insert(submissions).values({
      venueId,
      venueName: isNewVenue ? venueName : null,
      venueAddress: isNewVenue ? venueAddress : null,
      regionId: submittedRegion.id,
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
