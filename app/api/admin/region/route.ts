import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, regions, provinces } from "@/db";
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
    // Also persist this region's own province/country -- otherwise a region
    // picked from a still-visible dropdown on a session whose broader cookies
    // were never set (confirmed live 2026-09-12: a fresh session shows
    // pre-populated selects for DISPLAY only, without ever writing the
    // country/province cookies) leaves ADMIN_COUNTRY/PROVINCE_COOKIE absent.
    // AdminNav's picker then reads that as country="all", which hides the
    // province/region <select> elements entirely (their JSX is gated on the
    // parent level being a real id, not "all") -- the scope switcher
    // collapses to one dropdown and never recovers, even after reselecting.
    const [region] = await db.select({ provinceId: regions.provinceId }).from(regions).where(eq(regions.id, Number(regionId))).limit(1);
    if (region) {
      const [province] = await db.select({ countryId: provinces.countryId }).from(provinces).where(eq(provinces.id, region.provinceId)).limit(1);
      if (province) {
        res.cookies.set(ADMIN_COUNTRY_COOKIE, String(province.countryId), { httpOnly: true, maxAge: MAX_AGE });
      }
      res.cookies.set(ADMIN_PROVINCE_COOKIE, String(region.provinceId), { httpOnly: true, maxAge: MAX_AGE });
    }
    res.cookies.set(ADMIN_REGION_COOKIE, String(regionId), { httpOnly: true, maxAge: MAX_AGE });
  }
  return res;
}
