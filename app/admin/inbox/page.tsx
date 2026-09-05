import Link from "next/link";
import { getInboxThreads } from "@/lib/inbox-data";
import { InboxThreadList } from "@/components/InboxThreadList";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const threads = await getInboxThreads();
  const unreadTotal = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">
          Inbox {unreadTotal > 0 && <span className="text-accent">({unreadTotal})</span>}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/inbox/compose"
            className="press-pill rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium"
          >
            Compose
          </Link>
          <Link href="/admin/outreach" className="text-sm text-accent-dim underline">
            Outreach
          </Link>
          <Link href="/admin/analytics" className="text-sm text-accent-dim underline">
            Analytics
          </Link>
        </div>
      </div>

      {threads.length === 0 ? (
        <p className="text-muted-2 text-sm">No conversations yet.</p>
      ) : (
        <InboxThreadList
          threads={threads.map((t) => ({ ...t, lastAt: t.lastAt.toISOString() }))}
        />
      )}
    </div>
  );
}
