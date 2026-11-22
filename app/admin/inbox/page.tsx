import { getInboxThreads } from "@/lib/inbox-data";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { InboxThreadList } from "@/components/InboxThreadList";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const { regionIds } = await getSelectedAdminScope();
  const threads = await getInboxThreads(regionIds);

  return (
    <AdminShell active="inbox" maxWidth="max-w-7xl">
      <InboxThreadList threads={threads.map((t) => ({ ...t, lastAt: t.lastAt.toISOString() }))} />
    </AdminShell>
  );
}
