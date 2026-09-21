import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venueOwners } from "@/db";
import { eq } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";
import { hashPassword } from "@/lib/owner-password";

const bodySchema = z.object({ password: z.string().min(8).max(200) });

// Alongside, not instead of, magic-link login -- an owner must already be signed in
// (via a magic link) to set or change a password. There's no "current password"
// confirmation step here because getOwnerSession already proves the caller controls
// this account; if they want to change an existing password without one they still
// have the magic-link fallback to get in first.
export async function POST(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(venueOwners)
    .set({ passwordHash, passwordSetAt: new Date() })
    .where(eq(venueOwners.id, session.venueOwnerId));

  return NextResponse.json({ ok: true });
}
