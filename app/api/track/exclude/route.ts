import { NextResponse } from "next/server";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

// Visit /api/track/exclude once per browser (your real browser, and any
// automation profile like claude-in-chrome) to stop your own visits from
// being counted in the analytics dashboard. Visit /api/track/exclude?off=1
// to re-enable tracking for that browser.
export async function GET(req: Request) {
  const off = new URL(req.url).searchParams.get("off") === "1";
  const res = new NextResponse(
    off
      ? "Analytics tracking re-enabled for this browser."
      : "Analytics tracking disabled for this browser. Your visits will no longer be counted."
  );
  res.cookies.set("kds_dnt", "1", {
    maxAge: off ? 0 : TEN_YEARS,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
