import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVenueById } from "@/lib/venues-data";
import { getCurrentRegion } from "@/lib/regions";
import { ClaimVenueForm } from "@/components/ClaimVenueForm";

// Same dynamic-rendering requirement as the venue page: per-region correctness
// depends on the request's own domain via getCurrentRegion.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueById(Number(id));
  if (!venue) return { title: "Venue not found" };
  return { title: `Claim ${venue.name}` };
}

export default async function ClaimVenuePage({ params }: PageProps) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) notFound();

  const region = await getCurrentRegion();
  const venue = await getVenueById(venueId);
  if (!venue || venue.regionId !== region.id) notFound();

  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full px-4 py-6 gap-6">
      <div>
        <Link
          href={`/${region.slug}/venues/${venue.id}`}
          className="text-sm text-accent-dim hover:underline"
        >
          ← {venue.name}
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl sm:text-3xl text-foreground">Claim this listing</h1>
        <p className="text-sm text-muted">
          Are you the owner or manager of {venue.name}? Claim it to edit your specials, events, and
          menu directly.
        </p>
      </header>

      {venue.claimedAt !== null ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted">This venue has already been claimed.</p>
        </div>
      ) : (
        <ClaimVenueForm venueId={venue.id} venueName={venue.name} />
      )}
    </div>
  );
}
