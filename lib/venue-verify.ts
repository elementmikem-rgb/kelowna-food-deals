import { signLink, verifyLinkSignature } from "@/lib/link-secrets";

/**
 * Stateless, unguessable per-venue verification token (HMAC over the venue id),
 * identical pattern to lib/unsubscribe.ts's buildUnsubscribeToken -- verified by
 * recomputing and comparing, never stored, so a /verify/[token] link works without
 * a separate token table and without any login system.
 */
export function buildVenueVerifyToken(venueId: number): string {
  // Distinct HMAC input prefix ("verify:") from buildUnsubscribeToken's bare venueId,
  // so a leaked unsubscribe token can never be replayed as a verify token or vice versa.
  return signLink(`verify:${venueId}`);
}

export function verifyVenueVerifyToken(venueId: number, token: string): boolean {
  return verifyLinkSignature(`verify:${venueId}`, token);
}

// /verify/[token] lives under app/[region]/verify/..., unlike an API route --
// this needs the venue's own region slug in the path, not just the bare domain.
export function buildVenueVerifyUrl(venueId: number, regionSlug: string): string {
  const token = buildVenueVerifyToken(venueId);
  return `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${regionSlug}/verify/${venueId}-${token}`;
}
