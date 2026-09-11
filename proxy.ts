import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getRegionByDomain, getRegionBySlug } from "@/lib/regions";

// The consolidated multi-region domain -- region comes from the URL path
// here (/kelowna, /penticton) instead of the domain itself, since one domain
// now serves every region. The legacy per-region domains (kelownafooddeals.shop,
// pentictonfooddeals.shop) keep resolving by Host exactly as before until
// their traffic is fully redirected here.
const PATH_BASED_DOMAIN = process.env.PATH_BASED_DOMAIN ?? "todaystab.com";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  // Strip a port (local dev / preview URLs) so lookup matches the bare domain
  // stored in regions.domain.
  const domain = host.split(":")[0];

  // On the consolidated domain, only page routes carry a region in their own
  // path (app/[region]/...) -- api routes and the root city-picker page don't,
  // so a first-segment slug that doesn't match a real region intentionally
  // resolves to no region here rather than guessing. Those routes must accept
  // the region explicitly from the client instead of relying on this header.
  const region =
    domain === PATH_BASED_DOMAIN
      ? await getRegionBySlug(pathname.split("/")[1] ?? "")
      : await getRegionByDomain(domain);

  // A legacy per-region domain's pages moved to /[region]/... on the
  // consolidated domain -- kelownafooddeals.shop/events has no matching page
  // file anymore (it's now todaystab.com/kelowna/events), so this can't be a
  // deferred cleanup step: deploying the route move without this redirect
  // would 404 the old domain's entire live site immediately. /admin and /api
  // stay served from wherever they're hit (no region segment to redirect to).
  if (domain !== PATH_BASED_DOMAIN && region && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    // pathname === "/" would otherwise concatenate to "/kelowna/" -- a trailing
    // slash Next.js then 308s away on its own (trailingSlash defaults to
    // false), turning one redirect into a two-hop chain for every legacy-
    // domain visitor landing on the homepage. Only the root case needs this:
    // every other pathname already starts with its own "/", so concatenation
    // never introduces a second trailing slash.
    const targetPath = pathname === "/" ? `/${region.slug}` : `/${region.slug}${pathname}`;
    const target = new URL(targetPath, `https://${PATH_BASED_DOMAIN}`);
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target, 301);
  }

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
