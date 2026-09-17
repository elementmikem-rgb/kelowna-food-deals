import { NextResponse } from "next/server";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Sets the visitor's explicit language override and redirects back to
// wherever they clicked the toggle from. This is the ONLY thing that sets
// the `lang-pref` cookie -- see getEffectiveLanguage() in lib/i18n.ts, which
// deliberately never persists a cookie from Accept-Language auto-detection
// alone, only from a real click here.
// Built from PATH_BASED_DOMAIN, not `new URL(req.url).origin` -- Railway's
// internal request URL reflects the container's own bind address
// (localhost:8080), not the public hostname, the same reason every other
// redirect-building route in this codebase (bookings, tips, outreach) uses
// this same env var instead of the request's own origin.
const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang");
  const to = url.searchParams.get("to") || "/";

  if (lang !== "en" && lang !== "fr") {
    return NextResponse.json({ error: "lang must be 'en' or 'fr'" }, { status: 400 });
  }
  // Same-origin only -- `to` comes from a link we render ourselves, but a
  // request could still hand-craft an off-site redirect target, so this
  // never redirects anywhere but a path on this same site.
  const redirectTo = to.startsWith("/") && !to.startsWith("//") ? to : "/";

  const res = NextResponse.redirect(new URL(redirectTo, SITE_URL));
  res.cookies.set("lang-pref", lang, {
    maxAge: ONE_YEAR,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
