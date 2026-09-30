import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMapPinsInBounds, getEventMapPinsInBounds } from "@/lib/map-data";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { specialCategory } from "@/db/schema";

const querySchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
  day: z.coerce.number().int().min(0).max(6),
  category: z.enum(specialCategory).nullable().optional(),
  // "events" for the map's Events layer -- see getEventMapPinsInBounds. Kept
  // as one endpoint rather than two: both share the same bounds/rate-limit/
  // validation logic, only the underlying query and response shape differ.
  kind: z.enum(["specials", "events"]).default("specials"),
});

// Public, unauthenticated by design -- same posture as /api/track (called from
// every visitor's browser as they pan the map, no session to check). Feeds
// components/MapView.tsx's cross-region panning: given the visitor's current
// map viewport, returns venues (with today's/selected-day's matching
// specials) inside it, across every active region, not just the one the page
// itself is scoped to.
export async function GET(req: NextRequest) {
  // Debounced client-side panning can still fire several requests a minute during
  // active use -- checkRateLimit's window is minutes, not seconds, so 60/1 allows a
  // full minute of continuous panning while still blocking a scripted hammering.
  const { ok } = await checkRateLimit(req, "map-pins", 60, 1);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = req.nextUrl;
  const parsed = querySchema.safeParse({
    north: searchParams.get("north"),
    south: searchParams.get("south"),
    east: searchParams.get("east"),
    west: searchParams.get("west"),
    day: searchParams.get("day"),
    category: searchParams.get("category") || undefined,
    kind: searchParams.get("kind") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid bounds" }, { status: 400 });

  const { north, south, east, west, day, category, kind } = parsed.data;
  // A viewport spanning more than ~15 degrees (roughly the width of BC) is
  // either an extreme zoom-out or a malformed request -- either way, querying
  // it would mean scanning most of the country's venues per request, not a
  // reasonable "nearby" fetch. The map simply won't lazy-load pins past this
  // zoom level, same as most map products cap detail at low zoom.
  if (north - south > 15 || east - west > 15) {
    return NextResponse.json({ pins: [] });
  }

  if (kind === "events") {
    const pins = await getEventMapPinsInBounds({ north, south, east, west }, day);
    return NextResponse.json({ pins });
  }
  const pins = await getMapPinsInBounds({ north, south, east, west }, day, category ?? null);
  return NextResponse.json({ pins });
}
