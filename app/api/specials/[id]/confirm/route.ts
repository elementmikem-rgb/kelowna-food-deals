import { NextRequest, NextResponse } from "next/server";
import { db, specials, dealFeedback } from "@/db";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // A distinct rate-limit "route" per special, using the same checkRateLimit helper
  // every other endpoint on this site already uses -- gives a natural per-IP,
  // per-special cap with no new fingerprinting logic.
  const { ok: withinLimit } = await checkRateLimit(req, `special-confirm-${specialId}`, 3, 60 * 24);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many confirmations, try again later" }, { status: 429 });
  }

  const [row] = await db.select({ id: specials.id }).from(specials).where(eq(specials.id, specialId)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 400 });
  }

  await db.insert(dealFeedback).values({ itemId: specialId, kind: "special", feedbackType: "confirm" });

  return NextResponse.json({ ok: true });
}
