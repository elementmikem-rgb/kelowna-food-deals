import crypto from "crypto";

// Links in sent emails (verify, unsubscribe) are signed with ADMIN_SESSION_SECRET. Emails
// sent from a machine whose secret differs from the live site's would otherwise 404 or be
// rejected forever. ADMIN_SESSION_SECRET_PREVIOUS lets the live site keep accepting links
// signed with a retired or other-environment secret. New links always use the current one.
export function currentSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

function acceptedSecrets(): string[] {
  const prev = process.env.ADMIN_SESSION_SECRET_PREVIOUS;
  return prev ? [currentSecret(), prev] : [currentSecret()];
}

export function signLink(input: string): string {
  return crypto.createHmac("sha256", currentSecret()).update(input).digest("hex");
}

export function verifyLinkSignature(input: string, token: string): boolean {
  const b = Buffer.from(token);
  let ok = false;
  for (const secret of acceptedSecrets()) {
    const a = Buffer.from(crypto.createHmac("sha256", secret).update(input).digest("hex"));
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}
