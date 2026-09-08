import { NextRequest, NextResponse } from "next/server";
import { db, emailAttachments } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

// Sender-controlled MIME type; the webhook already rejects anything outside
// this set on the way in, but this route is the last line of defense against
// stored XSS (a "photo" whose real type is text/html, served inline from the
// app's own origin with the admin session cookie attached) -- never trust
// the stored value alone. Anything not in this set is served as a forced
// download instead of inline.
const INLINE_SAFE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

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
  // Strip quotes and control characters (CR/LF included -- a raw newline
  // makes the header value invalid and the whole response throw) rather
  // than just quotes.
  const safeFileName = row.fileName.replace(/["\x00-\x1f\x7f]/g, "");
  const inlineSafe = INLINE_SAFE_MIME.includes(row.contentType);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": inlineSafe ? row.contentType : "application/octet-stream",
      "Content-Disposition": `${inlineSafe ? "inline" : "attachment"}; filename="${safeFileName}"`,
      "Content-Length": String(buffer.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
