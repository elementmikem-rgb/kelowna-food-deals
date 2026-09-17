import { NextRequest, NextResponse } from "next/server";
import { consumeOwnerToken, resolveOwnerToken, OWNER_COOKIE, OWNER_COOKIE_MAX_AGE } from "@/lib/venue-owner-auth";

// Built from PATH_BASED_DOMAIN rather than req.url -- Railway's edge forwards this
// service internally with a Host header of localhost:8080, so req.url (and any
// NextResponse.redirect(path, req.url) built from it) resolves to
// https://localhost:8080/..., a dead address in the browser. Same pattern
// app/api/lang/set/route.ts and app/api/bookings/confirm-email/route.ts already use
// for exactly this reason.
const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

// The magic-link target: a GET so it works as a plain email link. Consumes the token
// (deletes it and mints a fresh one) rather than setting the URL-borne value itself as
// the session cookie -- see consumeOwnerToken's comment. The URL token is single-use;
// resolveOwnerToken is only used afterward to look up which venue the new cookie belongs
// to, for the redirect target.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const newToken = await consumeOwnerToken(token);

  if (!newToken) {
    return NextResponse.redirect(new URL("/owner/login/expired", SITE_URL));
  }

  const session = await resolveOwnerToken(newToken);
  if (!session || session.venueIds.length === 0) {
    // Can't happen in practice (the token was just minted with a fresh expiry, tied to
    // an owner that always has at least one linked venue), but fail closed rather than
    // redirect somewhere a cookie won't actually work.
    return NextResponse.redirect(new URL("/owner/login/expired", SITE_URL));
  }

  const res = NextResponse.redirect(new URL(`/owner/venue/${session.venueIds[0]}`, SITE_URL));
  // The redemption redirect itself still carries the (now-dead) URL token in its
  // Referer header on the next hop -- suppress it so it never leaves this response.
  res.headers.set("Referrer-Policy", "no-referrer");
  res.cookies.set(OWNER_COOKIE, newToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE,
  });
  return res;
}
