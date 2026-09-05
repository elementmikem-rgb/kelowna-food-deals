import type { Metadata } from "next";
import { getRecurringEvents, getUpcomingOneOffEvents } from "@/lib/events-data";
import { EventsBoard } from "@/components/EventsBoard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TipJar } from "@/components/TipJar";

export const revalidate = 3600; // ISR: refresh at most once an hour

export const metadata: Metadata = {
  title: "Live Music & Events",
  description:
    "Live music, trivia, karaoke, and sports nights happening at Kelowna bars and restaurants — checked and verified, not a stale calendar.",
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

      <EventsBoard recurring={recurring} upcoming={upcoming} />

      <TipJar />
      <SiteFooter />
    </div>
  );
}
