import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db, venueOwnerSessions, venueOwners } from "@/db";
import { eq, and, gt } from "drizzle-orm";

export const OWNER_COOKIE = "todaystab_owner_session";
// 30 days -- long enough that a venue owner who logged in once doesn't have to
// re-request a magic link every visit, short enough that a stale/forwarded link
// doesn't grant access indefinitely.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const OWNER_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;

// DB-backed token lookup, not a stateless signed cookie like lib/admin-auth.ts's HMAC
// approach -- owner pages are plain Next.js routes, not Edge middleware (proxy.ts), so
// there's no need for the Edge-compatible Web Crypto admin auth uses, and a DB row makes
// revoking a single owner's access (e.g. a disputed claim) a one-row delete instead of a
// secret rotation that would log out every admin session at once.
export async function createOwnerSession(venueOwnerId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.insert(venueOwnerSessions).values({ venueOwnerId, token, expiresAt });
  return token;
}

export interface OwnerSession {
  venueOwnerId: number;
  venueId: number;
}

export async function resolveOwnerToken(token: string): Promise<OwnerSession | null> {
  const [row] = await db
    .select({ venueOwnerId: venueOwnerSessions.venueOwnerId, venueId: venueOwners.venueId })
    .from(venueOwnerSessions)
    .innerJoin(venueOwners, eq(venueOwners.id, venueOwnerSessions.venueOwnerId))
    .where(and(eq(venueOwnerSessions.token, token), gt(venueOwnerSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

// Consumes the magic-link token from the approval email one time: deletes its row and, if
// still valid, mints a brand new session token to set as the cookie instead of reusing the
// URL-borne value. Without this, the exact string that rode in a plaintext email link (and
// can leak via mail-client link scanners, browser history, or server access logs) IS the
// long-lived session credential -- rotating on redemption means a leaked URL token is
// already dead by the time anyone could replay it.
export async function consumeOwnerToken(token: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(venueOwnerSessions)
      .where(and(eq(venueOwnerSessions.token, token), gt(venueOwnerSessions.expiresAt, new Date())))
      .returning({ venueOwnerId: venueOwnerSessions.venueOwnerId });
    if (!deleted) return null;

    const newToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
    await tx.insert(venueOwnerSessions).values({ venueOwnerId: deleted.venueOwnerId, token: newToken, expiresAt });
    return newToken;
  });
}

// Used by /owner/* pages and /api/owner/* routes -- reads the session cookie (already
// just the raw token, unlike the admin cookie's signed payload, since the token itself is
// only ever looked up server-side against the DB) and resolves it the same way a fresh
// magic-link click does.
export async function getOwnerSession(req: NextRequest): Promise<OwnerSession | null> {
  const token = req.cookies.get(OWNER_COOKIE)?.value;
  if (!token) return null;
  return resolveOwnerToken(token);
}

// Same as getOwnerSession, for a Server Component page rather than a route handler --
// unlike /admin/*, proxy.ts's middleware doesn't gate /owner/* (it only special-cases
// /admin), so every owner page reads and checks this itself.
export async function getOwnerSessionFromCookies(): Promise<OwnerSession | null> {
  const store = await cookies();
  const token = store.get(OWNER_COOKIE)?.value;
  if (!token) return null;
  return resolveOwnerToken(token);
}
