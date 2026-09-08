import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, specials } from "@/db";
import { eq, and } from "drizzle-orm";
import { verifyVenueVerifyToken } from "@/lib/venue-verify";

const confirmSchema = z.object({
  venueId: z.number().int().positive(),
  token: z.string().min(1),
  specialId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { venueId, token, specialId } = parsed.data;

  // Verify the token server-side rather than trusting the client-supplied venueId on
  // its own -- a forged venueId with no matching valid token is rejected here.
  if (!verifyVenueVerifyToken(venueId, token)) {
    return NextResponse.json({ error: "invalid or expired link" }, { status: 401 });
  }

  // Belt-and-suspenders: only allow confirming a special that actually belongs to the
  // venue the token was issued for, so a valid token for venue A can never be used
  // (even via a manually crafted request) to confirm venue B's specials.
  const result = await db
    .update(specials)
    .set({ venueConfirmedAt: new Date() })
    .where(and(eq(specials.id, specialId), eq(specials.venueId, venueId)));

  if (result.count === 0) {
    return NextResponse.json({ error: "special not found for this venue" }, { status: 404 });
  }

  // Bust the ISR cache so the venue's confirm shows up on the public pages
  // immediately, rather than up to an hour later per the revalidate = 3600 config.
  revalidatePath("/");
  revalidatePath(`/venues/${venueId}`);

  return NextResponse.json({ ok: true });
}
