import Link from "next/link";
import { getAdminNavCounts } from "@/lib/admin-counts";
import { getSelectedAdminRegionId } from "@/lib/admin-region";
import { db, regions } from "@/db";
import { AdminNav } from "./AdminNav";

export async function AdminShell({
  active,
  backHref,
  backLabel,
  maxWidth = "max-w-4xl",
  children,
}: {
  active: "submissions" | "outreach" | "inbox" | "sponsored" | "revenue" | "analytics" | "flagged" | null;
  // Sub-pages (compose, a single thread) sit one level under a nav section --
  // they keep the same persistent nav but add a breadcrumb back to it.
  backHref?: string;
  backLabel?: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  const [{ pendingSubmissions, unreadInbox, flaggedCount }, regionRows, selectedRegionId] = await Promise.all([
    getAdminNavCounts(),
    db.select({ id: regions.id, slug: regions.slug, brandName: regions.brandName }).from(regions),
    getSelectedAdminRegionId(),
  ]);

  return (
    <div className="flex flex-col flex-1 w-full">
      <AdminNav
        active={active}
        pendingSubmissions={pendingSubmissions}
        unreadInbox={unreadInbox}
        flaggedCount={flaggedCount}
        regions={regionRows}
        selectedRegionId={selectedRegionId}
      />
      <div className={`flex flex-col flex-1 ${maxWidth} mx-auto w-full px-4 sm:px-6 pb-10 gap-6`}>
        {backHref && (
          <Link href={backHref} className="text-sm text-accent-dim underline self-start -mt-1">
            ← {backLabel ?? "Back"}
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
