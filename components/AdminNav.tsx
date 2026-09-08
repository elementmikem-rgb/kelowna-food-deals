"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminSection = "submissions" | "outreach" | "inbox" | "sponsored" | "revenue" | "analytics" | "flagged";

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

function ScopeSwitcher({
  countries,
  provinces,
  regions,
  selectedCountryId,
  selectedProvinceId,
  selectedRegionId,
}: {
  countries: { id: number; name: string }[];
  provinces: { id: number; countryId: number; name: string }[];
  regions: { id: number; provinceId: number; brandName: string }[];
  selectedCountryId: number | "all";
  selectedProvinceId: number | "all";
  selectedRegionId: number | "all";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(level: "countryId" | "provinceId" | "regionId", value: string) {
    setLoading(true);
    await fetch("/api/admin/region", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [level]: value }),
    });
    router.refresh();
    setLoading(false);
  }

  const visibleProvinces =
    selectedCountryId === "all" ? [] : provinces.filter((p) => p.countryId === selectedCountryId);
  const visibleRegions =
    selectedProvinceId === "all" ? [] : regions.filter((r) => r.provinceId === selectedProvinceId);

  const selectClass =
    "press-pill rounded-full border border-border bg-transparent px-3 py-1.5 text-xs text-muted disabled:opacity-50";

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={String(selectedCountryId)}
        disabled={loading}
        onChange={(e) => handleChange("countryId", e.target.value)}
        className={selectClass}
      >
        <option value="all">All countries</option>
        {countries.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {selectedCountryId !== "all" && (
        <select
          value={String(selectedProvinceId)}
          disabled={loading}
          onChange={(e) => handleChange("provinceId", e.target.value)}
          className={selectClass}
        >
          <option value="all">All provinces</option>
          {visibleProvinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {selectedProvinceId !== "all" && (
        <select
          value={String(selectedRegionId)}
          disabled={loading}
          onChange={(e) => handleChange("regionId", e.target.value)}
          className={selectClass}
        >
          <option value="all">All regions</option>
          {visibleRegions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.brandName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function AdminNav({
  active,
  pendingSubmissions,
  unreadInbox,
  flaggedCount,
  countries,
  provinces,
  regions,
  selectedCountryId,
  selectedProvinceId,
  selectedRegionId,
}: {
  active: AdminSection | null;
  pendingSubmissions: number;
  unreadInbox: number;
  flaggedCount: number;
  countries: { id: number; name: string }[];
  provinces: { id: number; countryId: number; name: string }[];
  regions: { id: number; provinceId: number; brandName: string }[];
  selectedCountryId: number | "all";
  selectedProvinceId: number | "all";
  selectedRegionId: number | "all";
}) {
  const items: { key: AdminSection; href: string; label: string; badge?: number; tone?: "accent" | "evergreen" }[] = [
    { key: "submissions", href: "/admin/submissions", label: "Submissions", badge: pendingSubmissions, tone: "accent" },
    { key: "outreach", href: "/admin/outreach", label: "Outreach" },
    { key: "inbox", href: "/admin/inbox", label: "Inbox", badge: unreadInbox, tone: "evergreen" },
    { key: "sponsored", href: "/admin/sponsored", label: "Sponsored" },
    { key: "revenue", href: "/admin/revenue", label: "Revenue" },
    { key: "analytics", href: "/admin/analytics", label: "Analytics" },
    { key: "flagged", href: "/admin/flagged", label: "Flagged", badge: flaggedCount, tone: "accent" },
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

        <div className="flex items-center gap-2 shrink-0">
          <ScopeSwitcher
            countries={countries}
            provinces={provinces}
            regions={regions}
            selectedCountryId={selectedCountryId}
            selectedProvinceId={selectedProvinceId}
            selectedRegionId={selectedRegionId}
          />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
