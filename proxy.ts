import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getRegionByDomain } from "@/lib/regions";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  // Strip a port (local dev / preview URLs) so lookup matches the bare domain
  // stored in regions.domain.
  const domain = host.split(":")[0];

  const region = await getRegionByDomain(domain);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-region-id");
  if (region) requestHeaders.set("x-region-id", String(region.id));

  // Everything below this line is the pre-existing admin-auth gate, unchanged
  // in behavior -- it only now runs on a request that also carries the
  // region header for downstream pages to read.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (pathname === "/admin/login") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (await isAdminAuthed(req)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Runs on every request except static assets and Next's internal image
  // optimizer route, so region detection covers pages, API routes, and the
  // sitemap/robots handlers alike -- not just /admin like before.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
