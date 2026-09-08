import { AdminShell } from "@/components/AdminShell";
import { FlaggedSpecialsPanel } from "@/components/FlaggedSpecialsPanel";
import { getFlaggedSpecials } from "@/lib/flagged-data";

export const dynamic = "force-dynamic";

export default async function AdminFlaggedPage() {
  const flagged = await getFlaggedSpecials();

  return (
    <AdminShell active="flagged" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Flagged specials</h1>
      <FlaggedSpecialsPanel flagged={flagged} />
    </AdminShell>
  );
}
