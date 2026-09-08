import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, events, dealFeedback } from "@/db";
import { eq, and } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const actionSchema = z.object({ action: z.enum(["archive", "dismiss"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  if (parsed.data.action === "archive") {
    // archivedManually: true tells cron/upsert.ts's replaceVenueEvents this was a
    // human decision, not just superseded content -- a future scrape that still finds
    // this exact event on the venue's page should leave it archived, not reinsert it.
    await db
      .update(events)
      .set({ archivedAt: new Date(), archivedManually: true })
      .where(eq(events.id, eventId));
  }
  // Both "archive" and "dismiss" clear the dispute rows -- archiving an event
  // that's already flagged shouldn't leave it re-appearing in the queue if it's
  // ever manually unarchived later, and "dismiss" is explicitly "I looked, it's fine."
  await db.delete(dealFeedback).where(and(eq(dealFeedback.itemId, eventId), eq(dealFeedback.kind, "event"), eq(dealFeedback.feedbackType, "dispute")));

  return NextResponse.json({ ok: true });
}
