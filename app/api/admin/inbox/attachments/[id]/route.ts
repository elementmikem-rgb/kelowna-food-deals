import { NextRequest, NextResponse } from "next/server";
import { db, emailAttachments } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachmentId = Number(id);
  if (!Number.isInteger(attachmentId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(emailAttachments)
    .where(eq(emailAttachments.id, attachmentId))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buffer = Buffer.from(row.fileData, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": row.contentType,
      "Content-Disposition": `inline; filename="${row.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
