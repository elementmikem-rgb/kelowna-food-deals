import { signLink, verifyLinkSignature } from "@/lib/link-secrets";

/**
 * Stateless, unguessable per-venue unsubscribe token (HMAC over the venue id), so an
 * unsubscribe link works without a separate token table -- verified by recomputing and
 * comparing, never stored.
 */
export function buildUnsubscribeToken(venueId: number): string {
  return signLink(String(venueId));
}

export function verifyUnsubscribeToken(venueId: number, token: string): boolean {
  return verifyLinkSignature(String(venueId), token);
}

// /api/unsubscribe is a top-level route with no region segment of its own
// (like every API route under path-based routing -- see proxy.ts), so this
// always points at the bare consolidated domain regardless of which region
// the venue belongs to.
export function buildUnsubscribeUrl(venueId: number): string {
  const token = buildUnsubscribeToken(venueId);
  return `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/api/unsubscribe?venueId=${venueId}&token=${token}`;
}
