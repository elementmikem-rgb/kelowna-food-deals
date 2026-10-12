import { signLink, verifyLinkSignature } from "@/lib/link-secrets";

/**
 * Stateless, unguessable per-owner digest-unsubscribe token (HMAC over the venue owner
 * id) -- same approach as lib/unsubscribe.ts's venue-level token, kept separate because
 * this gates a different email stream (weekly owner stats digest, not cold outreach).
 */
export function buildDigestUnsubscribeToken(venueOwnerId: number): string {
  return signLink(`digest:${venueOwnerId}`);
}

export function verifyDigestUnsubscribeToken(venueOwnerId: number, token: string): boolean {
  return verifyLinkSignature(`digest:${venueOwnerId}`, token);
}

export function buildDigestUnsubscribeUrl(venueOwnerId: number): string {
  const token = buildDigestUnsubscribeToken(venueOwnerId);
  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  return `${siteUrl}/api/owner/digest-unsubscribe?venueOwnerId=${venueOwnerId}&token=${token}`;
}
