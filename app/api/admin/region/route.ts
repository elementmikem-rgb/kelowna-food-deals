import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ADMIN_REGION_COOKIE } from "@/lib/admin-region";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { regionId } = await req.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_REGION_COOKIE, String(regionId), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
