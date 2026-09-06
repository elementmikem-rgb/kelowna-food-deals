import type { Metadata } from "next";
import { getRecurringEvents, getUpcomingOneOffEvents } from "@/lib/events-data";
import { EventsBoard } from "@/components/EventsBoard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TipJar } from "@/components/TipJar";
import { SubmitEventCTA } from "@/components/SubmitEventCTA";

// Short window on purpose: getUpcomingOneOffEvents() filters against "today" at render
// time, so an hour-long cache can serve a generation built before midnight that still
// lists a show that has already happened. Five minutes bounds that to a shrug.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Kelowna Live Music & Events Tonight",
  description:
    "Live music, trivia, karaoke, and sports nights happening at Kelowna bars and restaurants — checked and verified, not a stale calendar.",
  alternates: { canonical: "https://kelownafooddeals.shop/events" },
  openGraph: {
    title: "Kelowna Live Music & Events Tonight",
    description:
      "Live music, trivia, karaoke, and sports nights happening at Kelowna bars and restaurants — checked and verified.",
    url: "https://kelownafooddeals.shop/events",
  },
};

export default async function EventsPage() {
  const [recurring, upcoming] = await Promise.all([
    getRecurringEvents(),
    getUpcomingOneOffEvents(),
  ]);

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-10">
      <SiteHeader
        active="events"
        subtitle="Live music, trivia, and karaoke nights around town — verified, not guessed."
      />

      <SubmitEventCTA />

      <EventsBoard recurring={recurring} upcoming={upcoming} />

      <TipJar />
      <SiteFooter />
    </div>
  );
}
