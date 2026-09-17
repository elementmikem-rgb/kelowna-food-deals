import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, menuItems } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable(),
  priceCents: z.number().int().nonnegative().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }

  const [updated] = await db
    .update(menuItems)
    .set({ ...parsed.data, lastVerifiedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.venueId, session.venueIds)))
    .returning({ id: menuItems.id });

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [archived] = await db
    .update(menuItems)
    .set({ archivedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.venueId, session.venueIds)))
    .returning({ id: menuItems.id });

  if (!archived) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
