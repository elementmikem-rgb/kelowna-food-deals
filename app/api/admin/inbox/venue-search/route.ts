import { NextRequest, NextResponse } from "next/server";
import { db, venues } from "@/db";
import { sql } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

// Admin-only venue lookup by name, for assigning an unmatched reply. Read-only, at most 8 rows.
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ venues: [] });
  const pattern = `%${q.replace(/[\%_]/g, (c) => `\${c}`)}%`;
  const rows = await db
    .select({ id: venues.id, name: venues.name, address: venues.address, city: venues.city })
    .from(venues)
    .where(sql`${venues.name} ilike ${pattern}`)
    .orderBy(venues.name)
    .limit(8);
  return NextResponse.json({ venues: rows });
}
