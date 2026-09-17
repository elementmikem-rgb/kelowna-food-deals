import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venueOwners } from "@/db";
import { eq } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";

const bodySchema = z.object({ optOut: z.boolean() });

export async function PATCH(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await db
    .update(venueOwners)
    .set({ weeklyDigestOptOut: parsed.data.optOut })
    .where(eq(venueOwners.id, session.venueOwnerId));

  return NextResponse.json({ ok: true });
}
