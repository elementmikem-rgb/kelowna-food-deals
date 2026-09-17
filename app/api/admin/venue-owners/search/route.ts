import { NextRequest, NextResponse } from "next/server";
import { db, venueOwners } from "@/db";
import { or, ilike } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

// Powers the admin claims queue's manual "link to existing owner" search (moat layer 3)
// -- the tool for a case no automatic signal can catch, e.g. the same real person
// running two unrelated-named venues under different contact details.
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await db
    .select({ id: venueOwners.id, name: venueOwners.name, email: venueOwners.email })
    .from(venueOwners)
    .where(or(ilike(venueOwners.name, `%${q}%`), ilike(venueOwners.email, `%${q}%`)))
    .limit(10);

  return NextResponse.json({ results });
}
