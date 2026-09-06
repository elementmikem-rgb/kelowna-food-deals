import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, venues } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const bodySchema = z.object({
  // true grants partner status (sets partnerSince to now if not already set),
  // false revokes it (clears partnerSince). Unlike featured/boosted this has
  // no expiry -- it's a standing status an admin turns on/off directly.
  partner: z.boolean(),
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

  const [updated] = await db
    .update(venues)
    .set({ partnerSince: parsed.data.partner ? new Date() : null })
    .where(eq(venues.id, venueId))
    .returning({ id: venues.id, partnerSince: venues.partnerSince });

  if (!updated) {
    return NextResponse.json({ error: "venue not found" }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/venues/${venueId}`);

  return NextResponse.json({ ok: true, partnerSince: updated.partnerSince });
}
