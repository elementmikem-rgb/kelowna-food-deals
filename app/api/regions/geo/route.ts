import { NextResponse } from "next/server";
import { db, regions } from "@/db";
import { and, eq, isNotNull } from "drizzle-orm";

// Region centers only (public data) -- the nearby-region prompt fetches this and does the
// distance math in the visitor's own browser, so their position is never sent to us.
export async function GET() {
  const rows = await db
    .select({ slug: regions.slug, brandName: regions.brandName, lat: regions.lat, lng: regions.lng })
    .from(regions)
    .where(and(eq(regions.active, true), isNotNull(regions.lat), isNotNull(regions.lng)));
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
