import Link from "next/link";
import { notFound } from "next/navigation";
import { getThreadMessages } from "@/lib/inbox-data";
import { InboxThread } from "@/components/InboxThread";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const { key } = await params;
  const thread = await getThreadMessages(key);
  if (!thread) notFound();

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <div>
        <Link href="/admin/inbox" className="text-sm text-accent-dim underline">
          ← Inbox
        </Link>
      </div>

      <InboxThread
        threadKey={key}
        venueId={thread.venueId}
        displayName={thread.displayName}
        contactEmail={thread.contactEmail}
        messages={thread.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
      />
    </div>
  );
}
