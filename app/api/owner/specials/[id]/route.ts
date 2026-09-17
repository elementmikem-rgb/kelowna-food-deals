import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, specialCategory } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable(),
  priceCents: z.number().int().nonnegative().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  category: z.enum(specialCategory),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }

  // venueId condition on the update itself is the ownership check -- never trust the
  // id alone. A venueId outside the session's owned list means zero rows affected, not
  // an error leaking whether the id exists at all.
  const [updated] = await db
    .update(specials)
    .set({ ...parsed.data, lastVerifiedAt: new Date() })
    .where(and(eq(specials.id, specialId), inArray(specials.venueId, session.venueIds)))
    .returning({ id: specials.id });

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
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [archived] = await db
    .update(specials)
    .set({ archivedAt: new Date() })
    .where(and(eq(specials.id, specialId), inArray(specials.venueId, session.venueIds)))
    .returning({ id: specials.id });

  if (!archived) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
