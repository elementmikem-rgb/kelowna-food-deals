import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, events, eventType } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable(),
  eventType: z.enum(eventType),
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  coverChargeCents: z.number().int().nonnegative().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }

  const [updated] = await db
    .update(events)
    .set({ ...parsed.data, lastVerifiedAt: new Date() })
    .where(and(eq(events.id, eventId), inArray(events.venueId, session.venueIds)))
    .returning({ id: events.id });

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
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [archived] = await db
    .update(events)
    .set({ archivedAt: new Date() })
    .where(and(eq(events.id, eventId), inArray(events.venueId, session.venueIds)))
    .returning({ id: events.id });

  if (!archived) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
