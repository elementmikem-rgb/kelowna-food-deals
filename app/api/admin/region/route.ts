import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ADMIN_COUNTRY_COOKIE, ADMIN_PROVINCE_COOKIE, ADMIN_REGION_COOKIE } from "@/lib/admin-region";

const MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { countryId, provinceId, regionId } = await req.json();
  const res = NextResponse.json({ ok: true });
  // Selecting a broader level (country/province) clears anything more specific
  // that was previously chosen -- otherwise switching country wouldn't actually
  // change scope if a leaf region cookie from a prior selection was still set,
  // since getSelectedAdminScope() checks region before province before country.
  if (countryId !== undefined) {
    res.cookies.set(ADMIN_COUNTRY_COOKIE, String(countryId), { httpOnly: true, maxAge: MAX_AGE });
    res.cookies.set(ADMIN_PROVINCE_COOKIE, "all", { httpOnly: true, maxAge: MAX_AGE });
    res.cookies.set(ADMIN_REGION_COOKIE, "all", { httpOnly: true, maxAge: MAX_AGE });
  } else if (provinceId !== undefined) {
    res.cookies.set(ADMIN_PROVINCE_COOKIE, String(provinceId), { httpOnly: true, maxAge: MAX_AGE });
    res.cookies.set(ADMIN_REGION_COOKIE, "all", { httpOnly: true, maxAge: MAX_AGE });
  } else if (regionId !== undefined) {
    res.cookies.set(ADMIN_REGION_COOKIE, String(regionId), { httpOnly: true, maxAge: MAX_AGE });
  }
  return res;
}
