import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venueOwners, venueOwnerVenues, venues } from "@/db";
import { eq, sql } from "drizzle-orm";
import { createOwnerSession } from "@/lib/venue-owner-auth";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { wrapOutreachHtml } from "@/lib/outreach-send";
import { getRegionById } from "@/lib/regions";

const requestSchema = z.object({ email: z.string().email() });

const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

// Self-serve re-entry for an owner who already claimed a listing but lost their session
// (new device, cleared cookies, or their one-time magic link already got redeemed
// elsewhere) -- previously the only way back in was emailing Mike to resend a link by
// hand. Always responds the same way regardless of whether the email matched an owner,
// so this can't be used to enumerate which addresses have an account.
export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const [owner] = await db
    .select({ id: venueOwners.id })
    .from(venueOwners)
    .where(sql`lower(${venueOwners.email}) = lower(${parsed.data.email})`)
    .limit(1);

  if (owner) {
    const [firstVenue] = await db
      .select({ venueId: venueOwnerVenues.venueId })
      .from(venueOwnerVenues)
      .where(eq(venueOwnerVenues.venueOwnerId, owner.id))
      .limit(1);

    const regionId = firstVenue
      ? (await db.select({ regionId: venues.regionId }).from(venues).where(eq(venues.id, firstVenue.venueId)).limit(1))[0]?.regionId
      : null;
    const region = regionId ? await getRegionById(regionId) : null;

    if (region) {
      const token = await createOwnerSession(owner.id);
      const loginUrl = `${SITE_URL}/owner/login/${token}`;
      const logoUrl = `${SITE_URL}/icons/icon-192.png`;
      const bodyHtml = `
        <p>Here's a fresh login link for your <strong>${region.brandName}</strong> listing:</p>
        <p><a href="${loginUrl}" style="display:inline-block;background:#c14a1f;color:#fffaf0;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Log in to your listing</a></p>
        <p style="font-size:13px;color:#6b654e;">This link works for 30 days and can only be used once.</p>
      `;
      const htmlContent = wrapOutreachHtml(bodyHtml, region.mailingAddress, region.brandName, logoUrl);
      try {
        await sendOutreachEmail({
          to: parsed.data.email,
          subject: `Your ${region.brandName} login link`,
          htmlContent,
          senderName: region.brandName,
          replyTo: region.domain
            ? `reply@reply.${region.domain}`
            : `reply@reply.${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`,
        });
      } catch (err) {
        console.error("Failed to send owner login-link email:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
