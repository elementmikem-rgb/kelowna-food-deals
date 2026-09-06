// Signed, tamper-proof tokens carrying a buyer's in-progress booking selection across
// the email-verification round trip (magic link) and into checkout. Deliberately
// separate from lib/admin-auth.ts's HMAC cookie -- different secret, different payload
// shape, and a leaked booking token must never be usable as an admin session. Unlike
// admin-auth.ts (which avoids Node's Buffer because proxy.ts runs on the Edge
// middleware runtime), this file is only ever imported by regular API routes, so
// Buffer is fine here.

function toBase64Url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function fromBase64Url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireSecret(): string {
  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) throw new Error("BOOKING_TOKEN_SECRET is not set");
  return secret;
}

export async function signBookingToken<T extends object>(payload: T, ttlMs: number): Promise<string> {
  const secret = requireSecret();
  const body = JSON.stringify({ ...payload, exp: Date.now() + ttlMs });
  const bodyB64 = toBase64Url(body);
  const sig = await hmac(bodyB64, secret);
  return `${bodyB64}.${sig}`;
}

export async function verifyBookingToken<T>(token: string): Promise<(T & { exp: number }) | null> {
  const secret = requireSecret();
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const bodyB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = await hmac(bodyB64, secret);
  if (!timingSafeEqualHex(sig, expectedSig)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(bodyB64)) as T & { exp: number };
    if (typeof parsed.exp !== "number" || Date.now() >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface BookingSelection {
  productType: import("@/db/schema").BookingProductType;
  venueId: number;
  specialId: number | null;
  category: import("@/db/schema").SpecialCategory | null;
  startDate: string;
  endDate: string;
  buyerEmail: string;
}
