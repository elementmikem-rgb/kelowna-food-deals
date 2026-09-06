"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminSection = "submissions" | "outreach" | "inbox" | "sponsored" | "analytics";

function Badge({ count, tone }: { count: number; tone: "accent" | "evergreen" }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[10px] font-mono-tabular font-medium text-background ${
        tone === "accent" ? "bg-accent" : "bg-evergreen"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="press-pill rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-muted hover:text-foreground disabled:opacity-50"
    >
      {loading ? "…" : "Log out"}
    </button>
  );
}

export function AdminNav({
  active,
  pendingSubmissions,
  unreadInbox,
}: {
  active: AdminSection | null;
  pendingSubmissions: number;
  unreadInbox: number;
}) {
  const items: { key: AdminSection; href: string; label: string; badge?: number; tone?: "accent" | "evergreen" }[] = [
    { key: "submissions", href: "/admin/submissions", label: "Submissions", badge: pendingSubmissions, tone: "accent" },
    { key: "outreach", href: "/admin/outreach", label: "Outreach" },
    { key: "inbox", href: "/admin/inbox", label: "Inbox", badge: unreadInbox, tone: "evergreen" },
    { key: "sponsored", href: "/admin/sponsored", label: "Sponsored" },
    { key: "analytics", href: "/admin/analytics", label: "Analytics" },
  ];

  return (
    <header className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-6 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap max-w-4xl mx-auto">
        <Link href="/admin/submissions" className="flex items-center gap-2 shrink-0">
          <span className="stamp px-2 py-0.5 text-[10px]">Admin</span>
          <span className="font-display text-sm text-foreground hidden sm:inline">
            Kelowna Food Deals
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 overflow-x-auto">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              data-selected={active === item.key}
              className={`press-pill flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm border whitespace-nowrap ${
                active === item.key
                  ? "bg-accent text-background border-accent"
                  : "bg-transparent text-muted border-border hover:border-muted hover:text-foreground"
              }`}
            >
              {item.label}
              {item.badge !== undefined && <Badge count={item.badge} tone={item.tone!} />}
            </Link>
          ))}
        </nav>

        <LogoutButton />
      </div>
    </header>
  );
}
