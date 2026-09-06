import { db, bookings, venues, specials, categorySponsors } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import type { SpecialCategory } from "@/db/schema";
import { pacificTodayISODate } from "@/lib/time";

export interface PendingBooking {
  id: number;
  productType: string;
  venueId: number | null;
  venueName: string | null;
  specialId: number | null;
  specialTitle: string | null;
  category: SpecialCategory | null;
  startDate: string;
  endDate: string;
  priceCents: number;
  buyerEmail: string;
  conflictDetected: boolean;
}

export async function getPendingApprovalBookings(): Promise<PendingBooking[]> {
  const rows = await db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      venueId: bookings.venueId,
      venueName: venues.name,
      specialId: bookings.specialId,
      specialTitle: specials.title,
      category: bookings.category,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      priceCents: bookings.priceCents,
      buyerEmail: bookings.buyerEmail,
      conflictDetected: bookings.conflictDetected,
    })
    .from(bookings)
    .leftJoin(venues, eq(bookings.venueId, venues.id))
    .leftJoin(specials, eq(bookings.specialId, specials.id))
    .where(eq(bookings.status, "pending_approval"))
    .orderBy(asc(bookings.createdAt));
  return rows;
}

export interface RefundNeeded {
  id: number;
  productType: string;
  priceCents: number;
  buyerEmail: string;
  stripePaymentIntentId: string | null;
}

export async function getRefundsNeeded(): Promise<RefundNeeded[]> {
  return db
    .select({
      id: bookings.id,
      productType: bookings.productType,
      priceCents: bookings.priceCents,
      buyerEmail: bookings.buyerEmail,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
    })
    .from(bookings)
    .where(and(eq(bookings.status, "rejected"), eq(bookings.refundNeeded, true)))
    .orderBy(asc(bookings.reviewedAt));
}

function endOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

// Writes an approved booking's dates into the existing "live now" columns that every
// render path already reads. Used both when an admin approves a booking whose range
// already covers today, and by the daily sync job (Task 11) for a future-dated
// approved booking on the day its range starts. Idempotent -- safe to call more than
// once for the same booking.
export async function activateBooking(bookingId: number): Promise<void> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;
  const until = endOfDayUtc(booking.endDate);

  if (booking.productType === "featured" && booking.venueId !== null) {
    await db.update(venues).set({ featuredUntil: until }).where(eq(venues.id, booking.venueId));
  } else if (booking.productType === "boost" && booking.specialId !== null) {
    await db.update(specials).set({ boostedUntil: until }).where(eq(specials.id, booking.specialId));
  } else if (booking.productType === "category_sponsor" && booking.category !== null && booking.venueId !== null) {
    const [venue] = await db.select().from(venues).where(eq(venues.id, booking.venueId));
    await db.delete(categorySponsors).where(eq(categorySponsors.category, booking.category));
    await db.insert(categorySponsors).values({
      category: booking.category,
      sponsorName: venue?.name ?? "Sponsor",
      sponsorUrl: venue?.website ?? null,
      sponsorUntil: until,
    });
  }
}

// Returns the booking's venueId (or null) so the caller can revalidate that venue's
// detail page too -- every product type sets venueId (see Task 1's schema note), so
// this is non-null whenever the approved booking affects a real venue's page.
export async function approveBooking(bookingId: number): Promise<{ venueId: number | null }> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking || booking.status !== "pending_approval") return { venueId: null };

  await db
    .update(bookings)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  const today = pacificTodayISODate();
  if (booking.startDate <= today && today <= booking.endDate) {
    await activateBooking(bookingId);
  }

  return { venueId: booking.venueId };
}

export async function rejectBooking(bookingId: number): Promise<void> {
  await db
    .update(bookings)
    .set({ status: "rejected", refundNeeded: true, reviewedAt: new Date() })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending_approval")));
}

export async function markRefunded(bookingId: number): Promise<void> {
  await db.update(bookings).set({ refundNeeded: false }).where(eq(bookings.id, bookingId));
}
