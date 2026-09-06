import { NextRequest } from "next/server";

export const ADMIN_COOKIE = "kds_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, down from 30

// The cookie is an HMAC-signed { sid, exp } payload rather than the raw secret itself.
// This means: (1) the secret can rotate without ever appearing in a cookie, (2) a leaked
// build log / error dump / screenshot doesn't hand over a working session, and (3) sessions
// carry a real expiry instead of relying on the browser's maxAge alone. Uses only Web
// Crypto + Web-standard encoding (no Node `Buffer`) since this is imported by proxy.ts,
// which Next.js runs on the Edge middleware runtime -- Buffer isn't guaranteed there.
function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(s: string): string {
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return atob(b64);
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
  return toHex(sig);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function buildAdminSessionCookie(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  const payload = JSON.stringify({
    sid: crypto.randomUUID(),
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  const payloadB64 = toBase64Url(payload);
  const sig = await hmac(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export const ADMIN_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;

// /api/admin/* routes aren't covered by proxy.ts (its matcher is /admin/:path*,
// which doesn't match /api/admin/*), so route handlers that send email or
// mutate data must check the session cookie themselves.
export async function isAdminAuthed(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!secret || !cookie) return false;

  const dot = cookie.lastIndexOf(".");
  if (dot === -1) return false;
  const payloadB64 = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);

  const expectedSig = await hmac(payloadB64, secret);
  if (!timingSafeEqualHex(sig, expectedSig)) return false;

  try {
    const { exp } = JSON.parse(fromBase64Url(payloadB64)) as { exp: number };
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}
