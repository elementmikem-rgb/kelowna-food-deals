import { NextResponse } from "next/server";

// Read at request time, not build time -- a NEXT_PUBLIC_ env var would bake into the
// client bundle at build, meaning pasting the real key into Railway later would need a
// redeploy to take effect. This route always reflects whatever's currently set.
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;
  return NextResponse.json({ publicKey });
}
