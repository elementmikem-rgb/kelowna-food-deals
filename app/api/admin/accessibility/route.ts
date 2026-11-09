import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, accessibilityVotes } from "@/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ACCESS_FEATURES } from "@/lib/accessibility";

const schema = z.object({
  venueId: z.number().int().positive(),
  // Omit to clear every accessibility vote on the venue.
  feature: z.enum(ACCESS_FEATURES).optional(),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { venueId, feature } = parsed.data;

  await db
    .delete(accessibilityVotes)
    .where(feature ? and(eq(accessibilityVotes.venueId, venueId), eq(accessibilityVotes.feature, feature)) : eq(accessibilityVotes.venueId, venueId));
  return NextResponse.json({ ok: true });
}
