import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, monetizationSettings } from "@/db";
import { bookingProductType, specialCategory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkAvailability } from "@/lib/booking-availability";
import { checkRateLimit } from "@/lib/request-rate-limit";

const bodySchema = z.object({
  productType: z.enum(bookingProductType),
  category: z.enum(specialCategory).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  // Read-only and non-mutating: this is a courtesy check the buyer's date pickers
  // fire while they compare ranges, so the ceiling is generous (60 per 10 minutes)
  // rather than the 30-per-hour used for the mutating booking routes. The client
  // debounces on top of this; the limit only exists to cap abuse.
  const { ok } = await checkRateLimit(req, "bookings-check-availability", 60, 10);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { productType, category, startDate, endDate } = parsed.data;

  if (endDate < startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const [settings] = await db
    .select()
    .from(monetizationSettings)
    .where(eq(monetizationSettings.productType, productType));
  if (!settings) return NextResponse.json({ error: "unknown product" }, { status: 400 });

  const available = await checkAvailability(
    db,
    productType,
    productType === "category_sponsor" ? category : null,
    settings.capCount,
    startDate,
    endDate
  );

  return NextResponse.json({ available });
}
