import crypto from "crypto";

/**
 * Stateless, unguessable per-venue unsubscribe token (HMAC over the venue id), so an
 * unsubscribe link works without a separate token table -- verified by recomputing and
 * comparing, never stored.
 */
export function buildUnsubscribeToken(venueId: number): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return crypto.createHmac("sha256", secret).update(String(venueId)).digest("hex");
}

export function verifyUnsubscribeToken(venueId: number, token: string): boolean {
  const expected = buildUnsubscribeToken(venueId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildUnsubscribeUrl(venueId: number): string {
  const token = buildUnsubscribeToken(venueId);
  return `https://kelownafooddeals.shop/api/unsubscribe?venueId=${venueId}&token=${token}`;
}
