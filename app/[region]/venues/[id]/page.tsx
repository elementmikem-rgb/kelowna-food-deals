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
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import { SpecialCard } from "@/components/SpecialCard";
import { EventCard } from "@/components/EventCard";
import { PreviousSpecials } from "@/components/PreviousSpecials";
import { SiteFooter } from "@/components/SiteFooter";
import { VenuePhotoGallery } from "@/components/VenuePhotoGallery";
import { ShareButton } from "@/components/ShareButton";
import { SaveVenueButton } from "@/components/SaveVenueButton";
import { formatPrice } from "@/lib/format";
import { groupByDayRange } from "@/lib/group-days";
import type { Language } from "@/lib/i18n";
import { getEffectiveLanguage } from "@/lib/i18n";

const content = {
  en: {
    metaDesc: (name: string, addr: string) =>
      `Current food/drink specials, events, and info for ${name} -- ${addr}. Verified, not guessed.`,
    backLink: "← All specials",
    shareText: (name: string, brandName: string) => `Specials & events at ${name} -- ${brandName}:`,
    websiteLabel: "Website",
    menuLabel: "Menu",
    mapsLabel: "Open in Google Maps",
    reviewsLabel: "Search reviews",
    currentSpecialsHeading: "Current Specials",
    noSpecials: "No current specials on file for this venue.",
    eventsHeading: "Events",
    mapTitle: (name: string) => `Map of ${name}`,
    photosHeading: "Photos",
    photosSubmitted: "Submitted by visitors -- menus, boards, and signage as spotted in the wild.",
    noPhotosPrompt: "No photos yet -- been here recently?",
    noPhotosAddLink: "Add one",
    noPhotosTrail: "and help other visitors picture the place.",
    fullMenuHeading: "Full Menu",
    fullMenuDesc: "Regular menu items spotted by visitors -- not deals, just what’s on offer.",
    claimVenue: "Own this venue? Claim your free listing",
  },
  fr: {
    metaDesc: (name: string, addr: string) =>
      `Spéciaux repas et boissons, événements et informations pour ${name} -- ${addr}. Vérifiés, pas devinés.`,
    backLink: "← Tous les spéciaux",
    shareText: (name: string, brandName: string) => `Spéciaux et événements à ${name} -- ${brandName} :`,
    websiteLabel: "Site web",
    menuLabel: "Menu",
    mapsLabel: "Ouvrir dans Google Maps",
    reviewsLabel: "Rechercher des avis",
    currentSpecialsHeading: "Spéciaux en cours",
    noSpecials: "Aucun spécial en cours pour cet établissement.",
    eventsHeading: "Événements",
    mapTitle: (name: string) => `Carte de ${name}`,
    photosHeading: "Photos",
    photosSubmitted: "Soumises par des visiteurs -- menus, tableaux et affichages repérés sur place.",
    noPhotosPrompt: "Pas encore de photos -- vous y êtes allé récemment ?",
    noPhotosAddLink: "Ajouter une photo",
    noPhotosTrail: "et aidez les autres visiteurs à s’imaginer l’endroit.",
    fullMenuHeading: "Menu complet",
    fullMenuDesc: "Articles du menu repérés par des visiteurs -- pas des offres spéciales, juste ce qui est proposé.",
    claimVenue: "C'est votre établissement? Réclamez votre fiche gratuite",
  },
} as const;

// Per-region correctness requires the request's own domain (getCurrentRegion),
// which forces dynamic rendering -- see app/page.tsx's comment.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueById(Number(id));
  const region = await getCurrentRegion();
  if (!venue || venue.regionId !== region.id) return { title: "Venue not found" };
  const lang = region.language as Language;
  const title = venue.name;
  const description = content[lang].metaDesc(venue.name, venue.address);
  const url = `/${region.slug}/venues/${venue.id}`;
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

  const region = await getCurrentRegion();
  const venue = await getVenueById(venueId);
  // A venue that exists but belongs to a different region must 404 here too --
  // otherwise a deep link (or a search-engine-indexed URL) from one domain
  // could still reach another region's venue page directly.
  if (!venue || venue.regionId !== region.id) notFound();
  const lang = await getEffectiveLanguage(region);

  const { timezone } = await getRegionContext(region);

  const [venueSpecials, venueEvents, previousSpecials, venuePhotos, venueMenuItems] =
    await Promise.all([
      getVenueSpecials(venueId),
      getVenueEvents(venueId, timezone),
      getVenuePreviousSpecials(venueId),
      getVenuePhotos(venueId),
      getVenueMenuItems(venueId),
    ]);

  const areaName = region.brandName.split(" ")[0];
  const mapQuery = encodeURIComponent(venue.address);
  const reviewsQuery = encodeURIComponent(`${venue.name} ${areaName} reviews`);

  const locality = venue.city ?? areaName;
  // venue.address is the full "123 Main St, Peachland, BC V0H 1X7" string, so the
  // city/region/postal tail was being restated by the sibling PostalAddress fields
  // -- and contradicted by them, back when addressLocality was hardcoded to Kelowna.
  const streetAddress = venue.address.split(",")[0].trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress,
      addressLocality: locality,
      addressRegion: "BC",
      addressCountry: "CA",
    },
    url: venue.website ?? undefined,
    telephone: venue.phone ?? undefined,
    menu: venue.menuUrl ?? undefined,
    image:
      venuePhotos.length > 0
        ? `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/api/venue-photos/${venuePhotos[0].id}`
        : undefined,
    geo:
      venue.lat !== null && venue.lng !== null
        ? { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng }
        : undefined,
    hasMenu:
      venueMenuItems.length > 0
        ? {
            "@type": "Menu",
            hasMenuSection: {
              "@type": "MenuSection",
              name: "Full Menu",
              hasMenuItem: venueMenuItems.map((m) => ({
                "@type": "MenuItem",
                name: m.name,
                description: m.description ?? undefined,
                offers:
                  m.priceCents !== null
                    ? {
                        "@type": "Offer",
                        price: (m.priceCents / 100).toFixed(2),
                        priceCurrency: "CAD",
                      }
                    : undefined,
              })),
            },
          }
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
        <Link href={`/${region.slug}`} className="text-sm text-accent-dim hover:underline">
          {content[lang].backLink}
        </Link>
      </div>

      {/* A visitor-submitted photo leads the page when one exists, photo-forward
          rather than buried after the map -- most venues don't have one yet
          (submission-driven), so the header below works fine without it too. */}
      {venuePhotos.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/venue-photos/${venuePhotos[0].id}`}
          alt=""
          className="w-full h-56 sm:h-72 object-cover rounded-2xl border border-border"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col gap-8 min-w-0">
          <header className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display text-3xl sm:text-4xl text-foreground">{venue.name}</h1>
              <div className="flex items-center gap-2 shrink-0 mt-1">
                <SaveVenueButton venueId={venue.id} venueName={venue.name} regionSlug={region.slug} lang={lang} />
                <ShareButton
                  title={venue.name}
                  text={content[lang].shareText(venue.name, region.brandName)}
                  url={`https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${region.slug}/venues/${venue.id}`}
                  className="press-pill inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-muted hover:text-foreground"
                />
              </div>
            </div>
            <p className="text-muted text-sm">{venue.address}</p>
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl text-foreground">{content[lang].currentSpecialsHeading}</h2>
            {venueSpecials.length === 0 ? (
              <p className="text-muted-2 text-sm">{content[lang].noSpecials}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groupByDayRange(venueSpecials).map((s) => (
                  <SpecialCard key={s.id} special={s} dayLabel={s.dayLabel} regionSlug={region.slug} lang={lang} />
                ))}
              </div>
            )}
          </section>

          {venueEvents.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl text-foreground">{content[lang].eventsHeading}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {venueEvents.map((e) => (
                  <EventCard key={e.id} event={e} regionSlug={region.slug} lang={lang} />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl text-foreground">{content[lang].photosHeading}</h2>
            {venuePhotos.length > 0 ? (
              <>
                <p className="text-sm text-muted-2 -mt-1">
                  {content[lang].photosSubmitted}
                </p>
                <VenuePhotoGallery photos={venuePhotos} venueName={venue.name} />
              </>
            ) : (
              <p className="text-sm text-muted-2 -mt-1">
                {content[lang].noPhotosPrompt}{" "}
                <Link href={`/${region.slug}/submit`} className="text-accent-dim underline">
                  {content[lang].noPhotosAddLink}
                </Link>{" "}
                {content[lang].noPhotosTrail}
              </p>
            )}
          </section>

          {venueMenuItems.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl text-foreground">{content[lang].fullMenuHeading}</h2>
              <p className="text-sm text-muted-2 -mt-1">
                {content[lang].fullMenuDesc}
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

          <PreviousSpecials specials={previousSpecials} regionSlug={region.slug} lang={lang} />
        </div>

        {/* Sticky action sidebar -- website/menu/phone/maps/reviews/claim, all
            previously a flat wrapped row of underlined links under the title,
            now a single scannable card that stays in view while the specials
            list (the actual reason someone opened this page) scrolls past it. */}
        <aside className="lg:sticky lg:top-6 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="press-pill rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-background text-center hover:bg-accent-dim"
          >
            {content[lang].mapsLabel}
          </a>
          {/* Moved up to 2nd position (from last, after Website/Menu/Phone/Reviews) and
              given the same bold filled style as Directions above -- it was previously a
              dashed, muted-color link below four outbound-link buttons that have nothing
              to do with being the owner, and data showed only ~7.5% of people who clicked
              through from an outreach email into this page ever found it (see the
              2026-10-06 claim-funnel analysis). */}
          {venue.claimedAt === null && (
            <Link
              href={`/${region.slug}/venues/${venue.id}/claim`}
              className="press-pill rounded-full bg-evergreen px-4 py-2.5 text-sm font-medium text-background text-center hover:bg-evergreen/90"
            >
              {content[lang].claimVenue}
            </Link>
          )}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="press-pill rounded-full border border-border px-4 py-2.5 text-sm text-foreground text-center hover:border-muted"
            >
              {content[lang].websiteLabel}
            </a>
          )}
          {venue.menuUrl && venue.menuUrl !== venue.website && (
            <a
              href={venue.menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="press-pill rounded-full border border-border px-4 py-2.5 text-sm text-foreground text-center hover:border-muted"
            >
              {content[lang].menuLabel}
            </a>
          )}
          {venue.phone && (
            <a
              href={`tel:${venue.phone}`}
              className="press-pill rounded-full border border-border px-4 py-2.5 text-sm text-foreground text-center hover:border-muted"
            >
              {venue.phone}
            </a>
          )}
          <a
            href={`https://www.google.com/search?q=${reviewsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="press-pill rounded-full border border-border px-4 py-2.5 text-sm text-foreground text-center hover:border-muted"
          >
            {content[lang].reviewsLabel}
          </a>

          <div className="rounded-xl overflow-hidden border border-border h-48 mt-2">
            <iframe
              title={content[lang].mapTitle(venue.name)}
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            />
          </div>
        </aside>
      </div>

      <SiteFooter />
    </div>
  );
}
