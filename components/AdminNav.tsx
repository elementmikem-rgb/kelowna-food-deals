"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminSection =
  | "submissions"
  | "claims"
  | "outreach"
  | "inbox"
  | "sponsored"
  | "revenue"
  | "analytics"
  | "flagged"
  | "scrapeHealth"
  | "chat"
  | "badges";

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

// A short, unambiguous label for whatever's currently selected -- shown
// prominently (not just inferred from the small dropdowns) so a page's data
// never has to be double-checked against the picker to know what you're
// actually looking at. Falls through country -> province -> region -> "all",
// same precedence getSelectedAdminScope() itself resolves by.
function scopeLabel(
  selectedCountryId: number | "all",
  selectedProvinceId: number | "all",
  selectedRegionId: number | "all",
  countries: { id: number; name: string }[],
  provinces: { id: number; countryId: number; name: string }[],
  regions: { id: number; provinceId: number; brandName: string }[]
): string {
  if (selectedRegionId !== "all") {
    const region = regions.find((r) => r.id === selectedRegionId);
    return region?.brandName ?? "Unknown region";
  }
  if (selectedProvinceId !== "all") {
    const province = provinces.find((p) => p.id === selectedProvinceId);
    return province ? `${province.name} (all regions)` : "Unknown province";
  }
  if (selectedCountryId !== "all") {
    const country = countries.find((c) => c.id === selectedCountryId);
    return country ? `${country.name} (all regions)` : "Unknown country";
  }
  return "All regions";
}

export function AdminNav({
  active,
  pendingSubmissions,
  pendingClaims,
  unreadInbox,
  flaggedCount,
  scrapeHealthCount,
  pendingBookings,
  countries,
  provinces,
  regions,
  selectedCountryId,
  selectedProvinceId,
  selectedRegionId,
}: {
  active: AdminSection | null;
  pendingSubmissions: number;
  pendingClaims: number;
  unreadInbox: number;
  flaggedCount: number;
  scrapeHealthCount: number;
  pendingBookings: number;
  countries: { id: number; name: string }[];
  provinces: { id: number; countryId: number; name: string }[];
  regions: { id: number; provinceId: number; brandName: string }[];
  selectedCountryId: number | "all";
  selectedProvinceId: number | "all";
  selectedRegionId: number | "all";
}) {
  const items: { key: AdminSection; href: string; label: string; badge?: number; tone?: "accent" | "evergreen" }[] = [
    { key: "submissions", href: "/admin/submissions", label: "Submissions", badge: pendingSubmissions, tone: "accent" },
    { key: "claims", href: "/admin/claims", label: "Claims", badge: pendingClaims, tone: "accent" },
    { key: "outreach", href: "/admin/outreach", label: "Outreach" },
    { key: "inbox", href: "/admin/inbox", label: "Inbox", badge: unreadInbox, tone: "evergreen" },
    { key: "sponsored", href: "/admin/sponsored", label: "Sponsored", badge: pendingBookings, tone: "accent" },
    { key: "revenue", href: "/admin/revenue", label: "Revenue" },
    { key: "analytics", href: "/admin/analytics", label: "Analytics" },
    { key: "flagged", href: "/admin/flagged", label: "Flagged", badge: flaggedCount, tone: "accent" },
    { key: "scrapeHealth", href: "/admin/scrape-health", label: "Scrape health", badge: scrapeHealthCount, tone: "accent" },
    { key: "chat", href: "/admin/chat", label: "Chat" },
    { key: "badges", href: "/admin/badges", label: "Badges" },
  ];

  const currentScopeLabel = scopeLabel(
    selectedCountryId,
    selectedProvinceId,
    selectedRegionId,
    countries,
    provinces,
    regions
  );

  const totalBadgeCount = items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
  const activeItem = items.find((item) => item.key === active);

  return (
    <header className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-6 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap max-w-4xl mx-auto">
        <Link href="/admin/submissions" className="flex items-center gap-2 shrink-0">
          <span className="stamp px-2 py-0.5 text-[10px]">Admin</span>
          <span className="font-display text-sm text-foreground hidden sm:inline">
            TodaysTab
          </span>
        </Link>

        {/* Below sm: a horizontal scroll with a fade hint turned out not to be enough --
            confirmed live 2026-10-03 that Scrape health (a count-32 badge) sat completely
            off-screen with no obvious cue to scroll for it. Replaced with an explicit
            dropdown menu instead, so every section (and its badge) is always reachable
            without guessing there's more off to the right. Desktop keeps the original
            horizontal row -- it already fit fine there. */}
        <MobileNavMenu items={items} active={active} totalBadgeCount={totalBadgeCount} activeLabel={activeItem?.label ?? "Menu"} />

        <nav className="hidden sm:flex items-center gap-1.5 flex-1 min-w-0">
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

      <div className="max-w-4xl mx-auto mt-2.5 flex items-center gap-2">
        <span className="stamp px-2.5 py-1 text-[11px] tracking-wide">Viewing: {currentScopeLabel}</span>
      </div>
    </header>
  );
}

function MobileNavMenu({
  items,
  active,
  totalBadgeCount,
  activeLabel,
}: {
  items: { key: AdminSection; href: string; label: string; badge?: number; tone?: "accent" | "evergreen" }[];
  active: AdminSection | null;
  totalBadgeCount: number;
  activeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press-pill flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm border border-border bg-transparent text-foreground w-full justify-between"
      >
        <span className="flex items-center gap-1.5 truncate">
          {activeLabel}
          <Badge count={totalBadgeCount} tone="accent" />
        </span>
        <span className="text-muted shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <nav className="absolute left-0 right-0 top-full mt-1.5 z-20 flex flex-col gap-1 rounded-2xl border border-border bg-background p-2 shadow-lg max-h-[70vh] overflow-y-auto">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                data-selected={active === item.key}
                className={`press-pill flex items-center justify-between gap-1.5 rounded-xl px-3.5 py-2 text-sm border whitespace-nowrap ${
                  active === item.key
                    ? "bg-accent text-background border-accent"
                    : "bg-transparent text-muted border-transparent hover:border-muted hover:text-foreground"
                }`}
              >
                {item.label}
                {item.badge !== undefined && <Badge count={item.badge} tone={item.tone!} />}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
