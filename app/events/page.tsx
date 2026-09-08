import type { Metadata } from "next";
import { getRecurringEvents, getUpcomingOneOffEvents } from "@/lib/events-data";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import { EventsBoard } from "@/components/EventsBoard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TipJar } from "@/components/TipJar";
import { SubmitEventCTA } from "@/components/SubmitEventCTA";

// Per-region correctness requires the request's own domain (getCurrentRegion),
// which forces dynamic rendering -- see app/page.tsx's comment.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  const areaName = region.brandName.split(" ")[0];
  const title = `${areaName} Live Music & Events Tonight`;
  const description = `Live music, trivia, karaoke, and sports nights happening at ${areaName} bars and restaurants — checked and verified, not a stale calendar.`;
  return {
    title,
    description,
    alternates: { canonical: `https://${region.domain}/events` },
    openGraph: { title, description, url: `https://${region.domain}/events` },
  };
}

export default async function EventsPage() {
  const region = await getCurrentRegion();
  const { timezone } = await getRegionContext(region);
  const areaName = region.brandName.split(" ")[0];
  const [recurring, upcoming] = await Promise.all([
    getRecurringEvents(region.id),
    getUpcomingOneOffEvents(region.id, timezone),
  ]);

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-10">
      <SiteHeader
        active="events"
        heading={`${areaName} Live Music & Events Tonight`}
        subtitle="Live music, trivia, and karaoke nights around town — verified, not guessed."
      />

      <SubmitEventCTA />

      <EventsBoard recurring={recurring} upcoming={upcoming} timezone={timezone} />

      <TipJar />
      <SiteFooter />
    </div>
  );
}
