import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venueOwners } from "@/db";
import { sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { createOwnerSession, resolveOwnerToken, OWNER_COOKIE, OWNER_COOKIE_MAX_AGE } from "@/lib/venue-owner-auth";
import { verifyPassword } from "@/lib/owner-password";

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Same generic-failure posture as request-login: a wrong email and a wrong password for a
// real email return the identical response, so this can't be used to enumerate accounts or
// distinguish "no such owner" from "wrong password" by response shape alone.
export async function POST(req: NextRequest) {
  // Low limit -- this is the one owner-facing endpoint that takes a guessable secret
  // (a password) rather than a token, so it's the actual brute-force target.
  const { ok } = await checkRateLimit(req, "owner-login-password", 8, 15);
  if (!ok) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const [owner] = await db
    .select({ id: venueOwners.id, passwordHash: venueOwners.passwordHash })
    .from(venueOwners)
    .where(sql`lower(${venueOwners.email}) = lower(${parsed.data.email})`)
    .limit(1);

  if (!owner || !owner.passwordHash || !(await verifyPassword(parsed.data.password, owner.passwordHash))) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await createOwnerSession(owner.id);
  // Session is stored as a fresh DB row above but resolveOwnerToken re-reads it -- keeps
  // this one place, not two, as the source of truth for "which venue does this token map
  // to", the same lookup every other owner page/route already relies on.
  const resolved = await resolveOwnerToken(token);
  const res = NextResponse.json({ ok: true, venueId: resolved?.venueIds[0] ?? null });
  res.cookies.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE,
  });
  return res;
}
