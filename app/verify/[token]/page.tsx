import { notFound } from "next/navigation";
import { db, venues, specials } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { verifyVenueVerifyToken } from "@/lib/venue-verify";
import { VenueVerifyList } from "@/components/VenueVerifyList";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawParam } = await params;
  // The route param is "{venueId}-{token}" (e.g. "42-abc123..."); split on the first
  // hyphen only, since the HMAC hex token itself never contains one.
  const separatorIndex = rawParam.indexOf("-");
  if (separatorIndex === -1) notFound();
  const venueId = Number(rawParam.slice(0, separatorIndex));
  const token = rawParam.slice(separatorIndex + 1);
  if (!Number.isInteger(venueId) || !verifyVenueVerifyToken(venueId, token)) notFound();

  const [venue] = await db.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) notFound();

  const venueSpecials = await db
    .select({
      id: specials.id,
      title: specials.title,
      description: specials.description,
      venueConfirmedAt: specials.venueConfirmedAt,
    })
    .from(specials)
    .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt)));

  return (
    <main className="min-h-full flex flex-col items-center px-4 py-10 gap-6">
      <h1 className="font-display text-2xl text-foreground">Confirm {venue.name}&apos;s specials</h1>
      <p className="text-sm text-muted max-w-md text-center">
        These are the specials currently listed for your venue. Click confirm on each one that&apos;s still accurate.
      </p>
      <VenueVerifyList venueId={venueId} token={token} specials={venueSpecials} />
    </main>
  );
}
