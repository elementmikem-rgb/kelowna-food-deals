import { notFound } from "next/navigation";
import { getThreadMessages } from "@/lib/inbox-data";
import { getVenuePanel } from "@/lib/inbox-venue";
import { InboxThread } from "@/components/InboxThread";
import { VenuePanel } from "@/components/inbox/VenuePanel";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const { key } = await params;
  const thread = await getThreadMessages(key);
  if (!thread) notFound();

  // Venue snapshot beside the conversation (only for a venue-matched thread). The newest reply's text lets the
  // panel flag details that differ from the listing.
  const venue = thread.venueId !== null ? await getVenuePanel(thread.venueId) : null;
  const lastReply = [...thread.messages].reverse().find((m) => m.direction === "inbound");

  return (
    <AdminShell active="inbox" maxWidth={venue ? "max-w-6xl" : "max-w-4xl"}>
      <div className={venue ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]" : ""}>
        <InboxThread
          threadKey={key}
          venueId={thread.venueId}
          displayName={thread.displayName}
          contactEmail={thread.contactEmail}
          venueUrl={thread.venueUrl}
          starred={thread.starred}
          status={thread.status}
          snoozedUntil={thread.snoozedUntil ? thread.snoozedUntil.toISOString() : null}
          archived={thread.archived}
          messages={thread.messages.map((m) => ({
            ...m,
            at: m.at.toISOString(),
            openedAt: m.openedAt ? m.openedAt.toISOString() : null,
            clickedAt: m.clickedAt ? m.clickedAt.toISOString() : null,
          }))}
        />
        {venue && (
          <div className="xl:sticky xl:top-4 xl:self-start">
            <VenuePanel venue={venue} venueUrl={thread.venueUrl} replyText={lastReply?.bodyText ?? null} />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
