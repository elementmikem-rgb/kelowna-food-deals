import crypto from "crypto";

/**
 * Stateless, unguessable per-owner digest-unsubscribe token (HMAC over the venue owner
 * id) -- same approach as lib/unsubscribe.ts's venue-level token, kept separate because
 * this gates a different email stream (weekly owner stats digest, not cold outreach).
 */
export function buildDigestUnsubscribeToken(venueOwnerId: number): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return crypto.createHmac("sha256", secret).update(`digest:${venueOwnerId}`).digest("hex");
}

export function verifyDigestUnsubscribeToken(venueOwnerId: number, token: string): boolean {
  const expected = buildDigestUnsubscribeToken(venueOwnerId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildDigestUnsubscribeUrl(venueOwnerId: number): string {
  const token = buildDigestUnsubscribeToken(venueOwnerId);
  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  return `${siteUrl}/api/owner/digest-unsubscribe?venueOwnerId=${venueOwnerId}&token=${token}`;
}
