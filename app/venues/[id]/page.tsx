import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getVenueById,
  getVenueSpecials,
  getVenuePreviousSpecials,
  getVenueEvents,
  getVenuePhotos,
  getVenueMenuItems,
} from "@/lib/venues-data";
import { SpecialCard } from "@/components/SpecialCard";
import { EventCard } from "@/components/EventCard";
import { PreviousSpecials } from "@/components/PreviousSpecials";
import { SiteFooter } from "@/components/SiteFooter";
import { VenuePhotoGallery } from "@/components/VenuePhotoGallery";
import { formatPrice } from "@/lib/format";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueById(Number(id));
  if (!venue) return { title: "Venue not found" };
  const title = `${venue.name} — Kelowna Specials & Events`;
  const description = `Current food/drink specials, events, and info for ${venue.name} — ${venue.address}. Verified, not guessed.`;
  const url = `https://kelownafooddeals.shop/venues/${venue.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function VenuePage({ params }: PageProps) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) notFound();

  const venue = await getVenueById(venueId);
  if (!venue) notFound();

  const [venueSpecials, venueEvents, previousSpecials, venuePhotos, venueMenuItems] =
    await Promise.all([
      getVenueSpecials(venueId),
      getVenueEvents(venueId),
      getVenuePreviousSpecials(venueId),
      getVenuePhotos(venueId),
      getVenueMenuItems(venueId),
    ]);

  const mapQuery = encodeURIComponent(venue.address);
  const reviewsQuery = encodeURIComponent(`${venue.name} Kelowna reviews`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: "Kelowna",
      addressRegion: "BC",
      addressCountry: "CA",
    },
    url: venue.website ?? undefined,
    telephone: venue.phone ?? undefined,
    menu: venue.menuUrl ?? undefined,
    geo:
      venue.lat !== null && venue.lng !== null
        ? { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng }
        : undefined,
  };

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
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

      {venuePhotos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl text-foreground">Photos</h2>
          <p className="text-sm text-muted-2 -mt-1">
            Submitted by visitors — menus, boards, and signage as spotted in the wild.
          </p>
          <VenuePhotoGallery photos={venuePhotos} venueName={venue.name} />
        </section>
      )}

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

      {venueMenuItems.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl text-foreground">Full Menu</h2>
          <p className="text-sm text-muted-2 -mt-1">
            Regular menu items spotted by visitors — not deals, just what&apos;s on offer.
          </p>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {venueMenuItems.map((m) => {
              const price = formatPrice(m.priceCents);
              return (
                <div key={m.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground/90">{m.name}</span>
                    {m.description && (
                      <span className="text-xs text-muted">{m.description}</span>
                    )}
                  </div>
                  {price && (
                    <span className="font-mono-tabular text-sm text-muted shrink-0">{price}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <PreviousSpecials specials={previousSpecials} />

      <SiteFooter />
    </div>
  );
}
