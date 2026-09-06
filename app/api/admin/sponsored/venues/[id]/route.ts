import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const bodySchema = z.object({
  // A number of days extends featuredUntil from now; null clears it (un-features).
  days: z.number().int().positive().max(365).nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const featuredUntil =
    parsed.data.days === null ? null : new Date(Date.now() + parsed.data.days * 24 * 60 * 60 * 1000);

  const [updated] = await db
    .update(venues)
    .set({ featuredUntil })
    .where(eq(venues.id, venueId))
    .returning({ id: venues.id });

  if (!updated) {
    return NextResponse.json({ error: "venue not found" }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/venues/${venueId}`);

  return NextResponse.json({ ok: true, featuredUntil });
}
