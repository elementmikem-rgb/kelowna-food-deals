import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, pushSubscriptions } from "@/db";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

const subscribeSchema = z.object({
  regionId: z.number().int().positive(),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// Public, unauthenticated by design -- same posture as /api/track and /api/map-pins,
// called from any visitor's browser once they opt in via components/PushOptIn.tsx.
export async function POST(req: NextRequest) {
  const { ok: withinLimit } = await checkRateLimit(req, "push-subscribe", 10, 60);
  if (!withinLimit) return NextResponse.json({ error: "too many requests" }, { status: 429 });

  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, { status: 400 });
  }
  const { regionId, endpoint, keys } = parsed.data;

  // Upsert on endpoint (its own unique index) -- a re-subscribe from the same browser
  // (e.g. after clearing the opt-in dismissal) updates the region/keys on the existing
  // row instead of erroring or creating a duplicate.
  await db
    .insert(pushSubscriptions)
    .values({ regionId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { regionId, p256dh: keys.p256dh, auth: keys.auth },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, parsed.data.endpoint));
  return NextResponse.json({ ok: true });
}
