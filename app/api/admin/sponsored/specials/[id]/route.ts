import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const bodySchema = z.object({
  // A number of days extends boostedUntil from now; null clears it (un-boosts).
  days: z.number().int().positive().max(365).nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const boostedUntil =
    parsed.data.days === null ? null : new Date(Date.now() + parsed.data.days * 24 * 60 * 60 * 1000);

  const [updated] = await db
    .update(specials)
    .set({ boostedUntil })
    .where(eq(specials.id, specialId))
    .returning({ id: specials.id });

  if (!updated) {
    return NextResponse.json({ error: "special not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, boostedUntil });
}
