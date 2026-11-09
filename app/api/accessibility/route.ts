import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, venues, accessibilityVotes } from "@/db";
import { checkRateLimit } from "@/lib/request-rate-limit";
import { ACCESS_ANSWERS, ACCESS_FEATURES } from "@/lib/accessibility";

const answer = z.enum(ACCESS_ANSWERS);
const schema = z.object({
  venueId: z.number().int().positive(),
  // Random per-browser id made by the form. Only its hash is stored, so the table never holds anything
  // that identifies a person; it just lets one browser change its own answer instead of adding votes.
  token: z.string().min(16).max(64),
  answers: z
    .object(Object.fromEntries(ACCESS_FEATURES.map((f) => [f, answer.optional()])) as Record<(typeof ACCESS_FEATURES)[number], z.ZodOptional<typeof answer>>)
    .strict()
    .refine((a) => Object.values(a).some(Boolean), "at least one answer"),
});

export async function POST(req: NextRequest) {
  const { ok: withinLimit } = await checkRateLimit(req, "accessibility", 20, 60);
  if (!withinLimit) return NextResponse.json({ error: "too many votes, try again later" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { venueId, token, answers } = parsed.data;

  const [venue] = await db.select({ id: venues.id }).from(venues).where(and(eq(venues.id, venueId), eq(venues.active, true))).limit(1);
  if (!venue) return NextResponse.json({ error: "not found" }, { status: 404 });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  for (const [feature, value] of Object.entries(answers)) {
    if (!value) continue;
    await db
      .insert(accessibilityVotes)
      .values({ venueId, feature: feature as (typeof ACCESS_FEATURES)[number], answer: value, tokenHash })
      .onConflictDoUpdate({
        target: [accessibilityVotes.venueId, accessibilityVotes.feature, accessibilityVotes.tokenHash],
        set: { answer: value, createdAt: sql`now()` },
      });
  }
  return NextResponse.json({ ok: true });
}
