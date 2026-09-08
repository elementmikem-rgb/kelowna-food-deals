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

// A single region selection always wins (most specific), then province, then
// country. The route resets deeper cookies to "all" whenever a broader level
// is picked, so each level must be checked for its own real (non-"all") value
// before falling through to the next -- an OR'd "all" check across all three
// levels would let a province/country pick collapse straight to unfiltered.
export async function getSelectedAdminScope(): Promise<AdminScope> {
  const jar = await cookies();
  const regionRaw = jar.get(ADMIN_REGION_COOKIE)?.value;
  const provinceRaw = jar.get(ADMIN_PROVINCE_COOKIE)?.value;
  const countryRaw = jar.get(ADMIN_COUNTRY_COOKIE)?.value;

  if (regionRaw && regionRaw !== "all" && !Number.isNaN(Number(regionRaw))) {
    return { regionIds: [Number(regionRaw)] };
  }

  if (provinceRaw && provinceRaw !== "all" && !Number.isNaN(Number(provinceRaw))) {
    const rows = await db
      .select({ id: regions.id })
      .from(regions)
      .where(eq(regions.provinceId, Number(provinceRaw)));
    return { regionIds: rows.map((r) => r.id) };
  }

  if (countryRaw && countryRaw !== "all" && !Number.isNaN(Number(countryRaw))) {
    const rows = await db
      .select({ id: regions.id })
      .from(regions)
      .innerJoin(provinces, eq(regions.provinceId, provinces.id))
      .where(eq(provinces.countryId, Number(countryRaw)));
    return { regionIds: rows.map((r) => r.id) };
  }

  if (regionRaw === "all" || provinceRaw === "all" || countryRaw === "all") {
    return { regionIds: "all" };
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

// As of Task 5, no page in this codebase still calls this -- outreach,
// revenue, sponsored, and submissions all migrated to getSelectedAdminScope().
// Kept exported regardless: the parent spec's own constraint is that this
// single-cookie API must not be deleted, only superseded, in case anything
// outside this plan's scope still depends on it.
export async function getSelectedAdminRegionId(): Promise<number | "all"> {
  const raw = (await cookies()).get(ADMIN_REGION_COOKIE)?.value;
  if (raw === "all") return "all";
  if (raw && !Number.isNaN(Number(raw))) return Number(raw);
  const current = await getCurrentRegion();
  return current.id;
}
