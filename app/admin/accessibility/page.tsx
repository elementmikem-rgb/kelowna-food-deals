import { AdminShell } from "@/components/AdminShell";
import { AccessibilityAdminPanel } from "@/components/AccessibilityAdminPanel";
import { getAccessibilityAdminRows } from "@/lib/accessibility-data";
import { getSelectedAdminScope } from "@/lib/admin-region";

export const dynamic = "force-dynamic";

export default async function AdminAccessibilityPage() {
  const { regionIds } = await getSelectedAdminScope();
  const rows = await getAccessibilityAdminRows(regionIds);
  return (
    <AdminShell active="access" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Accessibility votes</h1>
      <p className="text-sm text-muted-2">
        Visitor answers about step-free entrances, room inside and washrooms. A line shows on a venue page once 3 browsers say yes. Delete a venue's votes if they look wrong or abusive.
      </p>
      <AccessibilityAdminPanel rows={rows} />
    </AdminShell>
  );
}
