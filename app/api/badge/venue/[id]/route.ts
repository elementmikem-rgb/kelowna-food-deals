import { NextRequest, NextResponse } from "next/server";
import { getVenueById } from "@/lib/venues-data";
import { db, badgeImpressions } from "@/db";
import { checkRateLimit } from "@/lib/request-rate-limit";

// Public, unauthenticated by design -- this is an <img> src, loaded directly from a
// venue's own website by their visitors' browsers, not a call this app ever makes
// itself. Cached hard (image-hosting sites expect that): the badge's content never
// changes per-venue (no live confirm count or anything else that would need a fresh
// fetch -- see the owner-dashboard widget's comment for why a live number was
// deliberately left out), so there's nothing to invalidate.
export const revalidate = 86400;

const ACCENT = "#c14a1f";
const BG = "#fffaf0";
const BORDER = "#e4d9bb";
const FG = "#2a2818";

function badgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="48" viewBox="0 0 220 48" role="img" aria-label="Verified on TodaysTab">
  <rect x="0.5" y="0.5" width="219" height="47" rx="23.5" fill="${BG}" stroke="${BORDER}"/>
  <circle cx="24" cy="24" r="12" fill="${ACCENT}"/>
  <path d="M18.5 24.2l3.6 3.6 8-8.2" stroke="${BG}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <text x="42" y="20" font-family="Georgia, 'Times New Roman', serif" font-size="12" font-weight="700" fill="${FG}">Verified on</text>
  <text x="42" y="34" font-family="Georgia, 'Times New Roman', serif" font-size="13" font-weight="700" fill="${ACCENT}">TodaysTab</text>
</svg>`;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const venue = await getVenueById(venueId);
  if (!venue) {
    return NextResponse.json({ error: "venue not found" }, { status: 404 });
  }

  // Best-effort, fire-and-forget logging of who's actually loading this badge and
  // from where -- the Referer header on an <img> sub-request is the embedding page's
  // own URL, which is the real, passive "is this backlink actually live" signal (see
  // db/schema.ts's badgeImpressions comment). Generous rate limit: this exists to
  // catch a scripted hammering of one venue's badge, not to constrain real traffic to
  // a popular venue's website. A logging failure must never break the image response
  // itself -- the badge still needs to render even if this insert fails.
  const { ok } = await checkRateLimit(req, "badge-impression", 120, 1);
  if (ok) {
    db.insert(badgeImpressions)
      .values({
        venueId,
        referrer: req.headers.get("referer"),
        userAgent: req.headers.get("user-agent"),
      })
      .catch((err) => console.error("badge impression log failed:", err));
  }

  return new NextResponse(badgeSvg(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
