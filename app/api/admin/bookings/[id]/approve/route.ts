import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { approveBooking } from "@/lib/bookings-data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // No revalidatePath here: every public page these paths would target
  // (app/[region]/*) is already `dynamic = "force-dynamic"`, so there's no
  // Next.js cache for it to invalidate -- the pre-migration "/", "/events",
  // "/venues/[id]" paths below were dead code left over from before the
  // todaystab.com path-based routing migration.
  await approveBooking(bookingId);

  return NextResponse.json({ ok: true });
}
