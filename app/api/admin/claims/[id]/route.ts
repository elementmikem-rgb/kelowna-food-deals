import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venueClaimRequests, venueOwners, venueOwnerVenues, venues } from "@/db";
import { eq, and, or, sql, isNotNull } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createOwnerSession } from "@/lib/venue-owner-auth";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { wrapOutreachHtml } from "@/lib/outreach-send";
import { getRegionById } from "@/lib/regions";

// linkToOwnerId is the admin's manual "I know this is the same person" override (moat
// layer 3) -- used for exactly the case an automatic email/phone match can't catch, e.g.
// the same real owner running two unrelated-named venues with different contact details
// on file. When present it skips the auto-match entirely.
const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  linkToOwnerId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const claimId = Number(id);
  if (!Number.isInteger(claimId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const now = new Date();

  // Row lock first, re-verify status against the locked row (not an earlier unlocked
  // select) -- same guard as app/api/admin/submissions/[id]/route.ts against two
  // near-simultaneous requests both approving the same claim.
  const outcome = await db.transaction(async (tx) => {
    const [claim] = await tx
      .select()
      .from(venueClaimRequests)
      .where(eq(venueClaimRequests.id, claimId))
      .for("update");

    if (!claim) return { ok: false as const, status: 404, error: "claim not found" };
    if (claim.status !== "pending") {
      return { ok: false as const, status: 409, error: "claim already reviewed" };
    }

    if (parsed.data.action === "reject") {
      await tx
        .update(venueClaimRequests)
        .set({ status: "rejected", reviewedAt: now })
        .where(eq(venueClaimRequests.id, claimId));
      return {
        ok: true as const,
        venueOwnerId: null,
        isNewOwner: false,
        venueId: claim.venueId,
        regionId: null,
        email: null,
      };
    }

    const [venue] = await tx
      .select({ claimedAt: venues.claimedAt, regionId: venues.regionId })
      .from(venues)
      .where(eq(venues.id, claim.venueId));
    if (!venue) return { ok: false as const, status: 400, error: "venue no longer exists" };
    if (venue.claimedAt !== null) {
      return { ok: false as const, status: 409, error: "venue already claimed" };
    }

    let ownerId: number;
    let isNewOwner: boolean;

    if (parsed.data.linkToOwnerId) {
      const [existing] = await tx
        .select({ id: venueOwners.id })
        .from(venueOwners)
        .where(eq(venueOwners.id, parsed.data.linkToOwnerId))
        .limit(1);
      if (!existing) return { ok: false as const, status: 400, error: "linkToOwnerId not found" };
      ownerId = existing.id;
      isNewOwner = false;
    } else {
      // Automatic match: same email (case-insensitive) or same phone -- a real
      // independent owner often reuses one business phone across ventures even when
      // the contact email differs per location. Never matches on phone alone when
      // either side's phone is null, so two phoneless claims never collide.
      const [matched] = await tx
        .select({ id: venueOwners.id })
        .from(venueOwners)
        .where(
          or(
            sql`lower(${venueOwners.email}) = lower(${claim.email})`,
            claim.phone
              ? and(isNotNull(venueOwners.phone), eq(venueOwners.phone, claim.phone))
              : sql`false`
          )
        )
        .limit(1);

      if (matched) {
        ownerId = matched.id;
        isNewOwner = false;
      } else {
        const [created] = await tx
          .insert(venueOwners)
          .values({ email: claim.email, name: claim.name, phone: claim.phone })
          .returning({ id: venueOwners.id });
        ownerId = created.id;
        isNewOwner = true;
      }
    }

    await tx.insert(venueOwnerVenues).values({ venueOwnerId: ownerId, venueId: claim.venueId });
    await tx.update(venues).set({ claimedAt: now }).where(eq(venues.id, claim.venueId));
    await tx
      .update(venueClaimRequests)
      .set({ status: "approved", reviewedAt: now })
      .where(eq(venueClaimRequests.id, claimId));

    return {
      ok: true as const,
      venueOwnerId: ownerId,
      isNewOwner,
      venueId: claim.venueId,
      regionId: venue.regionId,
      email: claim.email,
    };
  });

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  // Login-link email sends outside the transaction, same pattern
  // savePhotoOnApproval follows in the submissions route -- a Brevo failure here
  // must not roll back the already-committed approval.
  if (outcome.venueOwnerId !== null && outcome.email !== null && outcome.regionId !== null) {
    const region = await getRegionById(outcome.regionId);
    if (region) {
      const token = await createOwnerSession(outcome.venueOwnerId);
      const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
      const loginUrl = `${siteUrl}/owner/login/${token}`;
      const logoUrl = `${siteUrl}/icons/icon-192.png`;
      // An owner who already has an account (matched or manually linked) doesn't need
      // another "you're approved, here's your first login" pitch -- just tell them the
      // new location was added, with a fresh link since they may not have an active
      // session on this device.
      const bodyHtml = outcome.isNewOwner
        ? `
        <p>Your claim on <strong>${region.brandName}</strong> has been approved.</p>
        <p>Click below to log in and start managing your listing:</p>
        <p><a href="${loginUrl}" style="display:inline-block;background:#c14a1f;color:#fffaf0;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Log in to your listing</a></p>
        <p style="font-size:13px;color:#6b654e;">This link works for 30 days.</p>
      `
        : `
        <p>A new location has been added to your <strong>${region.brandName}</strong> account.</p>
        <p><a href="${loginUrl}" style="display:inline-block;background:#c14a1f;color:#fffaf0;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Manage your listings</a></p>
        <p style="font-size:13px;color:#6b654e;">This link works for 30 days.</p>
      `;
      const footer = `${region.mailingAddress}`;
      const htmlContent = wrapOutreachHtml(bodyHtml, footer, region.brandName, logoUrl);
      try {
        await sendOutreachEmail({
          to: outcome.email,
          subject: outcome.isNewOwner
            ? `You're approved — manage your ${region.brandName} listing`
            : `New location added to your ${region.brandName} account`,
          htmlContent,
          senderName: region.brandName,
          replyTo: region.domain
            ? `reply@reply.${region.domain}`
            : `reply@reply.${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`,
        });
      } catch (err) {
        console.error("Failed to send owner login email:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
