import Link from "next/link";
import { getAdminNavCounts } from "@/lib/admin-counts";
import {
  ADMIN_COUNTRY_COOKIE,
  ADMIN_PROVINCE_COOKIE,
  ADMIN_REGION_COOKIE,
  getSelectedAdminScope,
} from "@/lib/admin-region";
import { getCurrentRegion } from "@/lib/regions";
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
  // A truly fresh session (no cookie set at all, as opposed to one explicitly
  // set to "all") is exactly the case getSelectedAdminScope() defaults to the
  // current domain's own region for, not to "all" -- the picker below must
  // show that same default, or it reads "All countries" while every page is
  // actually scoped to one region.
  const isFreshSession = !rawCountryId && !rawProvinceId && !rawRegionId;

  // AdminNav only needs the raw selected ids to render the dropdowns, but the
  // nav's badge counts must use the same resolved AdminScope every other
  // admin page filters by -- fetch it once here rather than duplicating
  // getSelectedAdminScope()'s cookie/DB logic.
  const { regionIds } = await getSelectedAdminScope();
  const [{ pendingSubmissions, unreadInbox, flaggedCount }, countryRows, provinceRows, regionRows] =
    await Promise.all([
      getAdminNavCounts(regionIds),
      db.select({ id: countries.id, name: countries.name }).from(countries),
      db.select({ id: provinces.id, countryId: provinces.countryId, name: provinces.name }).from(provinces),
      db.select({ id: regions.id, provinceId: regions.provinceId, brandName: regions.brandName }).from(regions),
    ]);

  let selectedCountryId: number | "all" = rawCountryId === "all" || !rawCountryId ? "all" : Number(rawCountryId);
  let selectedProvinceId: number | "all" =
    rawProvinceId === "all" || !rawProvinceId ? "all" : Number(rawProvinceId);
  let selectedRegionId: number | "all" = rawRegionId === "all" || !rawRegionId ? "all" : Number(rawRegionId);

  if (isFreshSession) {
    const current = await getCurrentRegion();
    const currentRegionRow = regionRows.find((r) => r.id === current.id);
    const currentProvinceRow = currentRegionRow
      ? provinceRows.find((p) => p.id === currentRegionRow.provinceId)
      : undefined;
    selectedRegionId = current.id;
    selectedProvinceId = currentRegionRow?.provinceId ?? "all";
    selectedCountryId = currentProvinceRow?.countryId ?? "all";
  }

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
