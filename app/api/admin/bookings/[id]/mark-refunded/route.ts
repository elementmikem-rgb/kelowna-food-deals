import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { markRefunded } from "@/lib/bookings-data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // Optional body: { amountCents?: number, refundedAt?: ISO string } for a partial or
  // back-dated refund. An empty body (what the admin panel sends) refunds the full amount
  // as of now.
  const body = (await req.json().catch(() => null)) as { amountCents?: unknown; refundedAt?: unknown } | null;
  const amountCents = typeof body?.amountCents === "number" ? body.amountCents : undefined;
  const refundedAt = typeof body?.refundedAt === "string" ? new Date(body.refundedAt) : undefined;
  if (amountCents !== undefined && (!Number.isInteger(amountCents) || amountCents <= 0)) {
    return NextResponse.json({ error: "invalid amountCents" }, { status: 400 });
  }
  if (refundedAt && Number.isNaN(refundedAt.getTime())) {
    return NextResponse.json({ error: "invalid refundedAt" }, { status: 400 });
  }

  try {
    const result = await markRefunded(bookingId, { amountCents, refundedAt });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: message.includes("not found") ? 404 : 400 });
  }
}
