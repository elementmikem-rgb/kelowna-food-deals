import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, categorySponsors } from "@/db";
import { specialCategory, type SpecialCategory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

// null sponsorName clears the sponsor for this category (deletes the row);
// non-null replaces whatever was there before -- at most one sponsor per
// category is meaningful at a time, so this is a set, not an add.
const bodySchema = z.object({
  sponsorName: z.string().trim().min(1).max(200).nullable(),
  sponsorUrl: z.string().trim().url().max(500).nullable().optional(),
  days: z.number().int().positive().max(365).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { category: rawCategory } = await params;
  if (!specialCategory.includes(rawCategory as SpecialCategory)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  const category = rawCategory as SpecialCategory;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { sponsorName, sponsorUrl, days } = parsed.data;

  await db.delete(categorySponsors).where(eq(categorySponsors.category, category));

  if (sponsorName === null) {
    revalidatePath("/");
    return NextResponse.json({ ok: true, cleared: true });
  }

  const sponsorUntil = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  const [created] = await db
    .insert(categorySponsors)
    .values({ category, sponsorName, sponsorUrl: sponsorUrl ?? null, sponsorUntil })
    .returning();

  revalidatePath("/");

  return NextResponse.json({ ok: true, sponsor: created });
}
