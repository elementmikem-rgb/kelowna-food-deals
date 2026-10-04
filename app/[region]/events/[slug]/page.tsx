import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRecurringEvents, getUpcomingOneOffEvents } from "@/lib/events-data";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import { EventsBoard } from "@/components/EventsBoard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TipJar } from "@/components/TipJar";
import { SubmitEventCTA } from "@/components/SubmitEventCTA";
import { FAQSection } from "@/components/FAQSection";
import { getEffectiveLanguage } from "@/lib/i18n";
import { buildEventsJsonLd, buildBreadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { eventTypeFromSlug, eventTypePageLabel } from "@/lib/event-type-slugs";

// Same reasoning as app/[region]/[slug]/page.tsx -- per-region correctness
// requires the request's own domain, which forces dynamic rendering.
export const dynamic = "force-dynamic";

interface EventTypeSlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventTypeSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const eventType = eventTypeFromSlug(slug);
  if (!eventType) return {};

  const region = await getCurrentRegion();
  const areaName = region.brandName.split(" ")[0];
  const label = eventTypePageLabel(eventType);

  const title = `${areaName} ${label} Nights`;
  const description = `${label} happening at ${areaName} bars and restaurants, by day of the week -- checked and verified, not a stale calendar.`;

  return {
    title,
    description,
    alternates: { canonical: `/${region.slug}/events/${slug}` },
    openGraph: { title, description, url: `/${region.slug}/events/${slug}` },
  };
}

export default async function EventTypeSlugPage({ params }: EventTypeSlugPageProps) {
  const { slug } = await params;
  const eventType = eventTypeFromSlug(slug);
  if (!eventType) notFound();

  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);
  const { timezone, province } = await getRegionContext(region);
  const areaName = region.brandName.split(" ")[0];
  const label = eventTypePageLabel(eventType);
  const [recurring, upcoming] = await Promise.all([
    getRecurringEvents(region.id),
    getUpcomingOneOffEvents(region.id, timezone),
  ]);
  const allEvents = [...recurring, ...upcoming];
  const jsonLd = buildEventsJsonLd(
    allEvents.filter((e) => e.eventType === eventType),
    region.brandName,
    timezone,
    province.code,
    region.slug
  );
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(SITE_URL, [
    { name: "Home", path: "/" },
    { name: region.brandName, path: `/${region.slug}` },
    { name: "Events", path: `/${region.slug}/events` },
    { name: `${label} Nights`, path: `/${region.slug}/events/${slug}` },
  ]);

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader
        active="events"
        heading={`${areaName} ${label} Nights`}
        subtitle={`${label} around town, by day of the week -- verified, not guessed.`}
      />

      <SubmitEventCTA regionSlug={region.slug} />

      <EventsBoard
        recurring={recurring}
        upcoming={upcoming}
        timezone={timezone}
        regionSlug={region.slug}
        lang={lang}
        regionLat={region.lat}
        regionLng={region.lng}
        initialType={eventType}
      />

      <TipJar regionSlug={region.slug} lang={lang} />
      <FAQSection lang={lang} />
      <SiteFooter />
    </div>
  );
}
