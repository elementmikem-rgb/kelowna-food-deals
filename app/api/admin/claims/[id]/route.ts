import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venueClaimRequests, venueOwners, venues } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createOwnerSession } from "@/lib/venue-owner-auth";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { wrapOutreachHtml } from "@/lib/outreach-send";
import { getRegionById } from "@/lib/regions";

const actionSchema = z.object({ action: z.enum(["approve", "reject"]) });

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

    const [owner] = await tx
      .insert(venueOwners)
      .values({ venueId: claim.venueId, email: claim.email, name: claim.name, phone: claim.phone })
      .returning({ id: venueOwners.id });

    await tx.update(venues).set({ claimedAt: now }).where(eq(venues.id, claim.venueId));
    await tx
      .update(venueClaimRequests)
      .set({ status: "approved", reviewedAt: now })
      .where(eq(venueClaimRequests.id, claimId));

    return {
      ok: true as const,
      venueOwnerId: owner.id,
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
      const bodyHtml = `
        <p>Your claim on <strong>${region.brandName}</strong> has been approved.</p>
        <p>Click below to log in and start managing your listing:</p>
        <p><a href="${loginUrl}" style="display:inline-block;background:#c14a1f;color:#fffaf0;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Log in to your listing</a></p>
        <p style="font-size:13px;color:#6b654e;">This link works for 30 days.</p>
      `;
      const footer = `${region.mailingAddress}`;
      const htmlContent = wrapOutreachHtml(bodyHtml, footer, region.brandName, logoUrl);
      try {
        await sendOutreachEmail({
          to: outcome.email,
          subject: `You're approved — manage your ${region.brandName} listing`,
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
