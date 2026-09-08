import Link from "next/link";
import { getAdminNavCounts } from "@/lib/admin-counts";
import { ADMIN_COUNTRY_COOKIE, ADMIN_PROVINCE_COOKIE, ADMIN_REGION_COOKIE } from "@/lib/admin-region";
import { db, regions, provinces, countries } from "@/db";
import { cookies } from "next/headers";
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
  const jar = await cookies();
  const rawCountryId = jar.get(ADMIN_COUNTRY_COOKIE)?.value;
  const rawProvinceId = jar.get(ADMIN_PROVINCE_COOKIE)?.value;
  const rawRegionId = jar.get(ADMIN_REGION_COOKIE)?.value;
  const selectedCountryId = rawCountryId === "all" || !rawCountryId ? "all" : Number(rawCountryId);
  const selectedProvinceId = rawProvinceId === "all" || !rawProvinceId ? "all" : Number(rawProvinceId);
  const selectedRegionId = rawRegionId === "all" || !rawRegionId ? "all" : Number(rawRegionId);

  // AdminNav only needs the raw selected ids to render the dropdowns, not a
  // resolved AdminScope -- getSelectedAdminScope() is exported directly from
  // lib/admin-region.ts for Task 5-7's admin pages to import themselves,
  // rather than being computed here and threaded through AdminShell.
  const [{ pendingSubmissions, unreadInbox, flaggedCount }, countryRows, provinceRows, regionRows] =
    await Promise.all([
      getAdminNavCounts(),
      db.select({ id: countries.id, name: countries.name }).from(countries),
      db.select({ id: provinces.id, countryId: provinces.countryId, name: provinces.name }).from(provinces),
      db.select({ id: regions.id, provinceId: regions.provinceId, brandName: regions.brandName }).from(regions),
    ]);

  return (
    <div className="flex flex-col flex-1 w-full">
      <AdminNav
        active={active}
        pendingSubmissions={pendingSubmissions}
        unreadInbox={unreadInbox}
        flaggedCount={flaggedCount}
        countries={countryRows}
        provinces={provinceRows}
        regions={regionRows}
        selectedCountryId={selectedCountryId}
        selectedProvinceId={selectedProvinceId}
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
