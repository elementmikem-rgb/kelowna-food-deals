import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, menuItems } from "@/db";
import { getOwnerSession } from "@/lib/venue-owner-auth";

const createSchema = z.object({
  venueId: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable(),
  priceCents: z.number().int().nonnegative().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }
  const { venueId, ...data } = parsed.data;
  if (!session.venueIds.includes(venueId)) {
    return NextResponse.json({ error: "not your venue" }, { status: 403 });
  }

  const [created] = await db
    .insert(menuItems)
    .values({
      venueId,
      ...data,
      sourceUrl: null,
      lastVerifiedAt: new Date(),
    })
    .returning({ id: menuItems.id });

  return NextResponse.json({ ok: true, id: created.id });
}
