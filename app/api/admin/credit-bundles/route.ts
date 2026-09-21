import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, creditBundles } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(creditBundles).orderBy(creditBundles.sortOrder);
  return NextResponse.json({ bundles: rows });
}

const bodySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(60),
  priceCents: z.number().int().positive(),
  credits: z.number().int().positive(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});

// Same "operator sets real numbers" posture as /api/admin/settings for
// monetizationSettings -- creditBundles was seeded with illustrative placeholder
// tiers (see db/migrations/0056_regular_johnny_storm.sql), this is how those get
// tuned to real numbers.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  await db
    .update(creditBundles)
    .set({
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      credits: parsed.data.credits,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
    })
    .where(eq(creditBundles.id, parsed.data.id));

  return NextResponse.json({ ok: true });
}
