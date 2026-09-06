import { db, bookings } from "@/db";
import { eq, and, lte, gte } from "drizzle-orm";
import { pacificTodayISODate } from "@/lib/time";
import { activateBooking } from "@/lib/bookings-data";

// Activates any approved booking whose date range has just started (today falls
// inside [startDate, endDate]) but which hasn't been written to the live columns yet.
// A booking approved while its range already covered today was activated immediately
// by approveBooking() -- this only catches future-dated approvals reaching their
// start date. Idempotent: activateBooking() is safe to call more than once.
export async function syncBookings(): Promise<{ activated: number }> {
  const today = pacificTodayISODate();
  const dueToday = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.status, "approved"), lte(bookings.startDate, today), gte(bookings.endDate, today)));

  for (const row of dueToday) {
    await activateBooking(row.id);
  }

  return { activated: dueToday.length };
}
