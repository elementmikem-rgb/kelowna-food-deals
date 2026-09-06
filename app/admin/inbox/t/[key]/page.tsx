import { notFound } from "next/navigation";
import { getThreadMessages } from "@/lib/inbox-data";
import { InboxThread } from "@/components/InboxThread";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const { key } = await params;
  const thread = await getThreadMessages(key);
  if (!thread) notFound();

  return (
    <AdminShell active="inbox" backHref="/admin/inbox" backLabel="Inbox" maxWidth="max-w-2xl">
      <InboxThread
        threadKey={key}
        venueId={thread.venueId}
        displayName={thread.displayName}
        contactEmail={thread.contactEmail}
        messages={thread.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
      />
    </AdminShell>
  );
}
