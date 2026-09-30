import { NextRequest, NextResponse } from "next/server";
import { db, events, dealFeedback } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

// "X people interested" social proof (Eventbrite-style) -- mirrors confirm/route.ts's
// shape exactly, reusing dealFeedback's existing kind-discriminated design with a third
// feedbackType rather than a new table. Unlike confirm's 3-per-day cap (a visitor might
// genuinely re-confirm across separate visits), interest is a one-time "I'm in" tap --
// 1 per IP per event, generously windowed at 30 days so it doesn't stay locked out
// forever if the count/rate-limit row expires, but the client-side localStorage gate
// (lib/event-interest.ts) is what actually prevents re-tapping in the normal case.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const { ok: withinLimit } = await checkRateLimit(req, `event-interest-${eventId}`, 1, 60 * 24 * 30);
  if (!withinLimit) {
    return NextResponse.json({ error: "already marked interested" }, { status: 429 });
  }

  const [row] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 400 });
  }

  await db.insert(dealFeedback).values({ itemId: eventId, kind: "event", feedbackType: "interested" });

  const [row2] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dealFeedback)
    .where(and(eq(dealFeedback.itemId, eventId), eq(dealFeedback.kind, "event"), eq(dealFeedback.feedbackType, "interested")));

  return NextResponse.json({ ok: true, interestedCount: row2.count });
}
