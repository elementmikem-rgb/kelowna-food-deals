import { NextRequest, NextResponse } from "next/server";
import { db, submissions } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

// Serves a pending submission's photo bytes so the admin queue can reference it by
// URL instead of inlining a ~5MB base64 data: URI per row into the page HTML.
// Admin-gated because these are unreviewed, unpublished public submissions.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [row] = await db
    .select({ photoData: submissions.photoData, photoMimeType: submissions.photoMimeType })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!row?.photoData || !row.photoMimeType) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(row.photoData, "base64"), {
    headers: {
      "Content-Type": row.photoMimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
