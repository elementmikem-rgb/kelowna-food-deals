import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  // This matcher only ever sees /admin/:path*, never /api/admin/* -- the
  // "/api/admin/login" case here was dead and misleadingly implied this proxy
  // covers the API routes too. Every /api/admin/* handler must call
  // isAdminAuthed() itself; see lib/admin-auth.ts.
  if (pathname === "/admin/login") return NextResponse.next();

  if (await isAdminAuthed(req)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
