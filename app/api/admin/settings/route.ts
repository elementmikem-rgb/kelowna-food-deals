import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, monetizationSettings } from "@/db";
import { bookingProductType } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(monetizationSettings);
  return NextResponse.json({ settings: rows });
}

const bodySchema = z.object({
  productType: z.enum(bookingProductType),
  capCount: z.number().int().positive().nullable(),
  priceCentsPerDay: z.number().int().nonnegative(),
  minDays: z.number().int().positive(),
  maxDays: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  if (parsed.data.minDays > parsed.data.maxDays) {
    return NextResponse.json({ error: "minDays must be <= maxDays" }, { status: 400 });
  }

  await db
    .update(monetizationSettings)
    .set({
      capCount: parsed.data.capCount,
      priceCentsPerDay: parsed.data.priceCentsPerDay,
      minDays: parsed.data.minDays,
      maxDays: parsed.data.maxDays,
    })
    .where(eq(monetizationSettings.productType, parsed.data.productType));

  return NextResponse.json({ ok: true });
}
