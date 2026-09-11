import { AdminShell } from "@/components/AdminShell";
import { FlaggedSpecialsPanel } from "@/components/FlaggedSpecialsPanel";
import { getFlaggedSpecials, getFlaggedEvents } from "@/lib/flagged-data";
import { getSelectedAdminScope } from "@/lib/admin-region";

export const dynamic = "force-dynamic";

export default async function AdminFlaggedPage() {
  const { regionIds } = await getSelectedAdminScope();
  const [flaggedSpecials, flaggedEvents] = await Promise.all([
    getFlaggedSpecials(regionIds),
    getFlaggedEvents(regionIds),
  ]);

  return (
    <AdminShell active="flagged" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Flagged specials</h1>
      <FlaggedSpecialsPanel flagged={flaggedSpecials} apiBasePath="/api/admin/flagged" emptyMessage="No flagged specials right now." />

      <h2 className="font-display text-2xl text-foreground mt-8">Flagged events</h2>
      <FlaggedSpecialsPanel flagged={flaggedEvents} apiBasePath="/api/admin/events/flagged" emptyMessage="No flagged events right now." />
    </AdminShell>
  );
}
