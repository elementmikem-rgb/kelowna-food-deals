import { cookies } from "next/headers";
import { getCurrentRegion } from "./regions";

export const ADMIN_REGION_COOKIE = "kds_admin_region";

export async function getSelectedAdminRegionId(): Promise<number | "all"> {
  const raw = (await cookies()).get(ADMIN_REGION_COOKIE)?.value;
  if (raw === "all") return "all";
  if (raw && !Number.isNaN(Number(raw))) return Number(raw);
  const current = await getCurrentRegion();
  return current.id;
}
