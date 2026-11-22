import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { specialCategory } from "@/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { addSpecialToVenue, setVenuePhone, verifyVenueEmail } from "@/lib/venue-apply";

// "Apply from the reply": writes one confirmed detail from a venue's email onto its listing. Called only when
// the admin clicks Save after reviewing an editable form, never automatically.
const specialSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  priceCents: z.number().int().min(0).max(100000).nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
  startTime: z.string().max(5).nullable().optional(),
  endTime: z.string().max(5).nullable().optional(),
  category: z.enum(specialCategory),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_phone"), venueId: z.number().int().positive(), phone: z.string().min(7).max(30) }),
  z.object({ action: z.literal("add_special"), venueId: z.number().int().positive(), special: specialSchema }),
  z.object({ action: z.literal("verify_email"), venueId: z.number().int().positive() }),
]);

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const result =
    body.action === "set_phone"
      ? await setVenuePhone(body.venueId, body.phone)
      : body.action === "verify_email"
        ? await verifyVenueEmail(body.venueId)
        : await addSpecialToVenue(body.venueId, body.special);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
