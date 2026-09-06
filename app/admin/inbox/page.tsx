import Link from "next/link";
import { getInboxThreads } from "@/lib/inbox-data";
import { InboxThreadList } from "@/components/InboxThreadList";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const threads = await getInboxThreads();
  const unreadTotal = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <AdminShell active="inbox" maxWidth="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">
          Inbox {unreadTotal > 0 && <span className="text-accent">({unreadTotal})</span>}
        </h1>
        <Link
          href="/admin/inbox/compose"
          className="press-pill rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium"
        >
          Compose
        </Link>
      </div>

      {threads.length === 0 ? (
        <p className="text-muted-2 text-sm">No conversations yet.</p>
      ) : (
        <InboxThreadList
          threads={threads.map((t) => ({ ...t, lastAt: t.lastAt.toISOString() }))}
        />
      )}
    </AdminShell>
  );
}
