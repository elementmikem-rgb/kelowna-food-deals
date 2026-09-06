import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, buildAdminSessionCookie } from "@/lib/admin-auth";

const loginSchema = z.object({ password: z.string().min(1).max(200) });

// Web-Crypto-based constant-time string compare (no Node `crypto.timingSafeEqual` --
// keeps this consistent with lib/admin-auth.ts, which avoids Node-only APIs).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "admin login not configured" }, { status: 500 });
  }

  // The whole admin surface is gated by this one password check, so it needs its own
  // tight lockout rather than sharing the public-endpoint limits.
  const { ok: withinLimit } = await checkRateLimit(req, "login", 10, 15);
  if (!withinLimit) {
    console.warn("[admin-login] rate limited");
    return NextResponse.json({ error: "too many attempts, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  if (!timingSafeEqual(parsed.data.password, process.env.ADMIN_PASSWORD)) {
    console.warn("[admin-login] failed attempt");
    return NextResponse.json({ error: "incorrect password" }, { status: 401 });
  }

  console.log("[admin-login] successful login");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await buildAdminSessionCookie(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
