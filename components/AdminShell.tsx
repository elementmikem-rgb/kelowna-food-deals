import Link from "next/link";
import { getAdminNavCounts } from "@/lib/admin-counts";
import { AdminNav } from "./AdminNav";

export async function AdminShell({
  active,
  backHref,
  backLabel,
  maxWidth = "max-w-4xl",
  children,
}: {
  active: "submissions" | "outreach" | "inbox" | "sponsored" | "analytics" | null;
  // Sub-pages (compose, a single thread) sit one level under a nav section --
  // they keep the same persistent nav but add a breadcrumb back to it.
  backHref?: string;
  backLabel?: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  const { pendingSubmissions, unreadInbox } = await getAdminNavCounts();

  return (
    <div className="flex flex-col flex-1 w-full">
      <AdminNav active={active} pendingSubmissions={pendingSubmissions} unreadInbox={unreadInbox} />
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
