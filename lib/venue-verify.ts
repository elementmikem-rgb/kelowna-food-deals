import crypto from "crypto";

/**
 * Stateless, unguessable per-venue verification token (HMAC over the venue id),
 * identical pattern to lib/unsubscribe.ts's buildUnsubscribeToken -- verified by
 * recomputing and comparing, never stored, so a /verify/[token] link works without
 * a separate token table and without any login system.
 */
export function buildVenueVerifyToken(venueId: number): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  // Distinct HMAC input prefix ("verify:") from buildUnsubscribeToken's bare venueId,
  // so a leaked unsubscribe token can never be replayed as a verify token or vice versa.
  return crypto.createHmac("sha256", secret).update(`verify:${venueId}`).digest("hex");
}

export function verifyVenueVerifyToken(venueId: number, token: string): boolean {
  const expected = buildVenueVerifyToken(venueId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildVenueVerifyUrl(venueId: number, domain: string): string {
  const token = buildVenueVerifyToken(venueId);
  return `https://${domain}/verify/${venueId}-${token}`;
}
