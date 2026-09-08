import { cookies } from "next/headers";
import { inArray, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db, regions, provinces } from "@/db";
import { getCurrentRegion } from "./regions";

export const ADMIN_COUNTRY_COOKIE = "kds_admin_country";
export const ADMIN_PROVINCE_COOKIE = "kds_admin_province";
export const ADMIN_REGION_COOKIE = "kds_admin_region";

export interface AdminScope {
  regionIds: number[] | "all";
}

// A single region selection always wins (most specific). Falling back through
// province -> country -> "no selection yet" mirrors the exact fallback order
// the old single-cookie getSelectedAdminRegionId() used, just with two more
// levels above it.
export async function getSelectedAdminScope(): Promise<AdminScope> {
  const jar = await cookies();
  const regionRaw = jar.get(ADMIN_REGION_COOKIE)?.value;
  const provinceRaw = jar.get(ADMIN_PROVINCE_COOKIE)?.value;
  const countryRaw = jar.get(ADMIN_COUNTRY_COOKIE)?.value;

  if (regionRaw === "all" || provinceRaw === "all" || countryRaw === "all") {
    return { regionIds: "all" };
  }

  if (regionRaw && !Number.isNaN(Number(regionRaw))) {
    return { regionIds: [Number(regionRaw)] };
  }

  if (provinceRaw && !Number.isNaN(Number(provinceRaw))) {
    const rows = await db
      .select({ id: regions.id })
      .from(regions)
      .where(eq(regions.provinceId, Number(provinceRaw)));
    return { regionIds: rows.map((r) => r.id) };
  }

  if (countryRaw && !Number.isNaN(Number(countryRaw))) {
    const rows = await db
      .select({ id: regions.id })
      .from(regions)
      .innerJoin(provinces, eq(regions.provinceId, provinces.id))
      .where(eq(provinces.countryId, Number(countryRaw)));
    return { regionIds: rows.map((r) => r.id) };
  }

  // Nothing selected yet (fresh admin session) -- default to the current
  // domain's own region, exactly like the old getSelectedAdminRegionId() did.
  const current = await getCurrentRegion();
  return { regionIds: [current.id] };
}

// Shared by every admin query converted in Tasks 5-7: "all" means no filter
// at all (condition omitted from the WHERE clause via undefined), otherwise
// an inArray on whichever column identifies that row's region.
export function regionScopeCondition(column: PgColumn, scope: number[] | "all"): SQL | undefined {
  return scope === "all" ? undefined : inArray(column, scope);
}

// Still used by app/admin/outreach, app/admin/revenue, app/admin/sponsored,
// and app/admin/submissions pages, which are migrated to getSelectedAdminScope()
// in a later task, not this one. Keep alongside the new scope-based API rather
// than breaking those callers.
export async function getSelectedAdminRegionId(): Promise<number | "all"> {
  const raw = (await cookies()).get(ADMIN_REGION_COOKIE)?.value;
  if (raw === "all") return "all";
  if (raw && !Number.isNaN(Number(raw))) return Number(raw);
  const current = await getCurrentRegion();
  return current.id;
}
