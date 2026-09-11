import { NextRequest, NextResponse } from "next/server";
import { db, events, dealFeedback } from "@/db";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

// Mirrors app/api/specials/[id]/confirm/route.ts exactly, for the events
// table -- dealFeedback.kind already supports "event" (see app/api/report/route.ts,
// which has taken event reports since it shipped), this just gives events the
// same positive "still accurate" signal specials already have.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const { ok: withinLimit } = await checkRateLimit(req, `event-confirm-${eventId}`, 3, 60 * 24);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many confirmations, try again later" }, { status: 429 });
  }

  const [row] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 400 });
  }

  await db.insert(dealFeedback).values({ itemId: eventId, kind: "event", feedbackType: "confirm" });

  return NextResponse.json({ ok: true });
}
