import { NextRequest } from "next/server";

const ADMIN_COOKIE = "kds_admin_session";

// /api/admin/* routes aren't covered by proxy.ts (its matcher is /admin/:path*,
// which doesn't match /api/admin/*), so route handlers that send email or
// mutate data must check the session cookie themselves.
export function isAdminAuthed(req: NextRequest): boolean {
  const session = req.cookies.get(ADMIN_COOKIE)?.value;
  return !!session && !!process.env.ADMIN_SESSION_SECRET && session === process.env.ADMIN_SESSION_SECRET;
}
