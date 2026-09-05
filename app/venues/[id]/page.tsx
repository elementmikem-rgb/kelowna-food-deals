import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getVenueById,
  getVenueSpecials,
  getVenuePreviousSpecials,
  getVenueEvents,
} from "@/lib/venues-data";
import { SpecialCard } from "@/components/SpecialCard";
import { EventCard } from "@/components/EventCard";
import { PreviousSpecials } from "@/components/PreviousSpecials";
import { SiteFooter } from "@/components/SiteFooter";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueById(Number(id));
  if (!venue) return { title: "Venue not found" };
  return {
    title: `${venue.name} — Specials & Events`,
    description: `Current specials, events, and info for ${venue.name} in Kelowna, BC. ${venue.address}.`,
  };
}

export default async function VenuePage({ params }: PageProps) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) notFound();

  const venue = await getVenueById(venueId);
  if (!venue) notFound();

  const [venueSpecials, venueEvents, previousSpecials] = await Promise.all([
    getVenueSpecials(venueId),
    getVenueEvents(venueId),
    getVenuePreviousSpecials(venueId),
  ]);

  const mapQuery = encodeURIComponent(venue.address);
  const reviewsQuery = encodeURIComponent(`${venue.name} Kelowna reviews`);

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-8">
      <div>
        <Link href="/" className="text-sm text-accent-dim hover:underline">
          ← All specials
        </Link>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl sm:text-4xl text-foreground">{venue.name}</h1>
        <p className="text-muted text-sm">{venue.address}</p>
        <div className="flex flex-wrap gap-3 text-sm mt-1">
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-dim underline"
            >
              Website
            </a>
          )}
          {venue.menuUrl && venue.menuUrl !== venue.website && (
            <a
              href={venue.menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-dim underline"
            >
              Menu
            </a>
          )}
          {venue.phone && <span className="text-muted">{venue.phone}</span>}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-dim underline"
          >
            Open in Google Maps
          </a>
          <a
            href={`https://www.google.com/search?q=${reviewsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-dim underline"
          >
            Search reviews
          </a>
        </div>
      </header>

      <div className="rounded-2xl overflow-hidden border border-border h-64">
        <iframe
          title={`Map of ${venue.name}`}
          className="w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-foreground">Current Specials</h2>
        {venueSpecials.length === 0 ? (
          <p className="text-muted-2 text-sm">No current specials on file for this venue.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {venueSpecials.map((s) => (
              <SpecialCard key={s.id} special={s} />
            ))}
          </div>
        )}
      </section>

      {venueEvents.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl text-foreground">Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {venueEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      <PreviousSpecials specials={previousSpecials} />

      <SiteFooter />
    </div>
  );
}
