import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSpecialsWithVenueForDay } from "@/lib/data";
import { getRegionBySlug } from "@/lib/regions";
import { checkRateLimit } from "@/lib/request-rate-limit";

const querySchema = z.object({
  region: z.string().min(1).max(100),
  day: z.coerce.number().int().min(0).max(6),
});

// Public, unauthenticated by design -- same posture as /api/map-pins. Backs
// SpecialsBoard's day-tab switch: the server only ever hydrates the page with one
// day's specials up front (see lib/data.ts's getSpecialsWithVenueForDay comment for
// why), so picking a different day fetches that day's set here instead of it already
// being in memory.
export async function GET(req: NextRequest) {
  const { ok } = await checkRateLimit(req, "specials-by-day", 60, 1);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = req.nextUrl;
  const parsed = querySchema.safeParse({
    region: searchParams.get("region"),
    day: searchParams.get("day"),
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid params" }, { status: 400 });

  const region = await getRegionBySlug(parsed.data.region);
  if (!region) return NextResponse.json({ error: "region not found" }, { status: 404 });

  const specials = await getSpecialsWithVenueForDay(region.id, parsed.data.day);
  return NextResponse.json({ specials });
}
