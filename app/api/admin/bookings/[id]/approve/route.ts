import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

  const { venueId } = await approveBooking(bookingId);

  revalidatePath("/");
  revalidatePath("/events");
  if (venueId !== null) revalidatePath(`/venues/${venueId}`);

  return NextResponse.json({ ok: true });
}
