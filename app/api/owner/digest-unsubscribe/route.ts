import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, venueOwners, venueOwnerVenues, venues, regions } from "@/db";
import { verifyDigestUnsubscribeToken } from "@/lib/owner-digest-unsubscribe";
import { isFormConfirmation, renderUnsubscribePage } from "@/lib/unsubscribe-page";

// The weekly listing stats email's opt-out. Same posture as /api/unsubscribe: no login (it has to work straight from
// the email), and a plain GET changes NOTHING, because corporate mail scanners follow every link in an email within
// seconds and would silently opt owners out. GET shows a confirmation page; only a POST opts out: the page's button
// (body "confirm=1", answered with a page) or a mail provider's native one-click button (RFC 8058, body
// "List-Unsubscribe=One-Click", answered with plain text). The token and venueOwnerId stay in the query string.
const HTML = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } as const;

async function brandFor(venueOwnerId: number): Promise<{ brand: string; language: "en" | "fr" }> {
  const [row] = await db
    .select({ brandName: regions.brandName, language: regions.language })
    .from(venueOwnerVenues)
    .innerJoin(venues, eq(venues.id, venueOwnerVenues.venueId))
    .innerJoin(regions, eq(regions.id, venues.regionId))
    .where(eq(venueOwnerVenues.venueOwnerId, venueOwnerId))
    .limit(1);
  return { brand: row?.brandName ?? "TodaysTab", language: row?.language === "fr" ? "fr" : "en" };
}

function valid(req: NextRequest): number | null {
  const venueOwnerId = Number(req.nextUrl.searchParams.get("venueOwnerId"));
  const token = req.nextUrl.searchParams.get("token");
  return Number.isInteger(venueOwnerId) && venueOwnerId > 0 && token && verifyDigestUnsubscribeToken(venueOwnerId, token)
    ? venueOwnerId
    : null;
}

export async function GET(req: NextRequest) {
  const venueOwnerId = valid(req);
  if (venueOwnerId === null) {
    return new NextResponse(renderUnsubscribePage({ state: "invalid", brand: "TodaysTab", language: "en", kind: "digest" }), { status: 400, headers: HTML });
  }
  const { brand, language } = await brandFor(venueOwnerId);
  const action = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  return new NextResponse(renderUnsubscribePage({ state: "confirm", brand, language, action, kind: "digest" }), { status: 200, headers: HTML });
}

export async function POST(req: NextRequest) {
  const venueOwnerId = valid(req);
  const body = await req.text().catch(() => "");
  const fromPage = isFormConfirmation(body);

  if (venueOwnerId === null) {
    if (fromPage) {
      return new NextResponse(renderUnsubscribePage({ state: "invalid", brand: "TodaysTab", language: "en", kind: "digest" }), { status: 400, headers: HTML });
    }
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 });
  }

  await db.update(venueOwners).set({ weeklyDigestOptOut: true }).where(eq(venueOwners.id, venueOwnerId));

  if (fromPage) {
    const { brand, language } = await brandFor(venueOwnerId);
    return new NextResponse(renderUnsubscribePage({ state: "done", brand, language, kind: "digest" }), { status: 200, headers: HTML });
  }
  return new NextResponse("Unsubscribed.", { status: 200, headers: { "Content-Type": "text/plain" } });
}
