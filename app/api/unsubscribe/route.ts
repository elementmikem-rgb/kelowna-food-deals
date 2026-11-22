import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, venues, regions } from "@/db";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { isFormConfirmation, renderUnsubscribePage } from "@/lib/unsubscribe-page";

// GET shows a confirmation page and changes NOTHING: mail scanners follow every link in an email within seconds, and
// when GET unsubscribed on its own it silently removed real prospects (42 of 72 unsubscribes came within 5 minutes
// of delivery). Only a POST unsubscribes: either the page's button (body "confirm=1", answered with a page) or a
// mail provider's native one-click button (RFC 8058, body "List-Unsubscribe=One-Click", answered with plain text).
// The token and venueId stay in the query string, so the emails already sent keep working.
const HTML = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } as const;

async function brandFor(venueId: number): Promise<{ brand: string; language: "en" | "fr" }> {
  const [row] = await db
    .select({ brandName: regions.brandName, language: regions.language })
    .from(venues)
    .leftJoin(regions, eq(venues.regionId, regions.id))
    .where(eq(venues.id, venueId))
    .limit(1);
  return { brand: row?.brandName ?? "TodaysTab", language: row?.language === "fr" ? "fr" : "en" };
}

function valid(req: NextRequest): number | null {
  const venueId = Number(req.nextUrl.searchParams.get("venueId"));
  const token = req.nextUrl.searchParams.get("token");
  return Number.isInteger(venueId) && venueId > 0 && token && verifyUnsubscribeToken(venueId, token) ? venueId : null;
}

export async function GET(req: NextRequest) {
  const venueId = valid(req);
  if (venueId === null) {
    return new NextResponse(renderUnsubscribePage({ state: "invalid", brand: "TodaysTab", language: "en" }), { status: 400, headers: HTML });
  }
  const { brand, language } = await brandFor(venueId);
  const action = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  return new NextResponse(renderUnsubscribePage({ state: "confirm", brand, language, action }), { status: 200, headers: HTML });
}

export async function POST(req: NextRequest) {
  const venueId = valid(req);
  const body = await req.text().catch(() => "");
  const fromPage = isFormConfirmation(body);

  if (venueId === null) {
    if (fromPage) {
      return new NextResponse(renderUnsubscribePage({ state: "invalid", brand: "TodaysTab", language: "en" }), { status: 400, headers: HTML });
    }
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 });
  }

  // isNull keeps the first timestamp when the request is repeated.
  await db.update(venues).set({ unsubscribedAt: new Date() }).where(and(eq(venues.id, venueId), isNull(venues.unsubscribedAt)));

  if (fromPage) {
    const { brand, language } = await brandFor(venueId);
    return new NextResponse(renderUnsubscribePage({ state: "done", brand, language }), { status: 200, headers: HTML });
  }
  return new NextResponse("Unsubscribed.", { status: 200, headers: { "Content-Type": "text/plain" } });
}
