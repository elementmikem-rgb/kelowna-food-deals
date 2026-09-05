import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "kds_admin_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login" || pathname === "/api/admin/login") return NextResponse.next();

  const session = req.cookies.get(ADMIN_COOKIE)?.value;
  if (session && process.env.ADMIN_SESSION_SECRET && session === process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
