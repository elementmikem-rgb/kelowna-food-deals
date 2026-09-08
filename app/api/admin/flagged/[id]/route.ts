import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, dealFeedback } from "@/db";
import { eq, and } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

const actionSchema = z.object({ action: z.enum(["archive", "dismiss"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  if (parsed.data.action === "archive") {
    await db.update(specials).set({ archivedAt: new Date() }).where(eq(specials.id, specialId));
  }
  // Both "archive" and "dismiss" clear the dispute rows -- archiving a special
  // that's already flagged shouldn't leave it re-appearing in the queue if it's
  // ever manually unarchived later, and "dismiss" is explicitly "I looked, it's fine."
  await db.delete(dealFeedback).where(and(eq(dealFeedback.itemId, specialId), eq(dealFeedback.kind, "special"), eq(dealFeedback.feedbackType, "dispute")));

  return NextResponse.json({ ok: true });
}
