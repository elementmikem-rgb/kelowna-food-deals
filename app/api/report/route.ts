import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, events, dealFeedback } from "@/db";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

const reportSchema = z.object({
  specialId: z.number().int().positive(),
  venueId: z.number().int().positive().nullable(),
  kind: z.enum(["special", "event"]).default("special"),
});

export async function POST(req: NextRequest) {
  const { ok: withinLimit } = await checkRateLimit(req, "report", 10, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many reports, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { specialId, kind } = parsed.data;

  // Confirm the target actually exists before logging a dispute against it -- an
  // invalid specialId (typo, stale client, tampered request) shouldn't silently create
  // an orphaned feedback row that the admin queue then has to render around.
  const rows =
    kind === "event"
      ? await db.select({ id: events.id }).from(events).where(eq(events.id, specialId)).limit(1)
      : await db.select({ id: specials.id }).from(specials).where(eq(specials.id, specialId)).limit(1);

  if (!rows[0]) {
    return NextResponse.json({ error: "not found" }, { status: 400 });
  }

  await db.insert(dealFeedback).values({ itemId: specialId, kind, feedbackType: "dispute" });

  return NextResponse.json({ ok: true });
}
