import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/request-rate-limit";

const ADMIN_COOKIE = "kds_admin_session";

const loginSchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "admin login not configured" }, { status: 500 });
  }

  // The whole admin surface is gated by this one password check, so it needs its own
  // tight lockout rather than sharing the public-endpoint limits.
  const { ok: withinLimit } = await checkRateLimit(req, "login", 10, 15);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many attempts, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  if (parsed.data.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, process.env.ADMIN_SESSION_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
