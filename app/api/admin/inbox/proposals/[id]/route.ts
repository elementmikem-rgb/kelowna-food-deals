import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, inboxProposals, inboundEmails, specialCategory } from "@/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { addSpecialToVenue, setVenuePhone } from "@/lib/venue-apply";
import { sendInboxReply } from "@/lib/inbox-send";
import { checkDraftReply, findDisallowedLink } from "@/lib/reply-proposal";

// Acts on one proposal made by scripts/propose-replies.ts. Runs only when Mike clicks a button on the proposal card.
// "dismiss" just closes it. "apply" writes what he left ticked, in this order: the special, the phone, and the reply
// LAST, so a failure partway never sends a reply for a change that did not happen. The special and phone writes are
// safe to repeat, so after a failure the same click can simply be retried.
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dismiss") }),
  z.object({
    action: z.literal("apply"),
    special: z
      .object({
        title: z.string().trim().min(1).max(80),
        description: z.string().max(300).nullable().optional(),
        priceCents: z.number().int().min(0).max(100000).nullable().optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
        startTime: z.string().max(5).nullable().optional(),
        endTime: z.string().max(5).nullable().optional(),
        category: z.enum(specialCategory),
      })
      .nullable(),
    phone: z.string().max(40).nullable(),
    reply: z.string().max(4000).nullable(), // the (possibly edited) draft to send, or null to send nothing
  }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const proposalId = Number(id);
  if (!Number.isInteger(proposalId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const [row] = await db.select().from(inboxProposals).where(eq(inboxProposals.id, proposalId)).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.status !== "pending") return NextResponse.json({ error: `already ${row.status}` }, { status: 409 });

  if (body.action === "dismiss") {
    await db.update(inboxProposals).set({ status: "dismissed", decidedAt: new Date() }).where(eq(inboxProposals.id, proposalId));
    return NextResponse.json({ ok: true });
  }

  if (row.venueId === null) return NextResponse.json({ error: "proposal has no venue" }, { status: 400 });
  const [inbound] = await db
    .select({ fromEmail: inboundEmails.fromEmail, subject: inboundEmails.subject })
    .from(inboundEmails)
    .where(eq(inboundEmails.id, row.inboundEmailId))
    .limit(1);
  if (!inbound) return NextResponse.json({ error: "original email is gone" }, { status: 404 });

  // Validate everything BEFORE any write, so an unsafe edit changes nothing. The special's text goes on the public
  // listing and the reply goes out under Mike's name, so both get the same strict link check.
  if (body.reply !== null) {
    const problem = checkDraftReply(body.reply);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }
  if (body.special && (findDisallowedLink(body.special.title) || (body.special.description && findDisallowedLink(body.special.description)))) {
    return NextResponse.json({ error: "the special's text contains a link to another site" }, { status: 400 });
  }

  const done: string[] = [];
  const fail = async (step: string, error: string) => {
    await db.update(inboxProposals).set({ error: `${step}: ${error}` }).where(eq(inboxProposals.id, proposalId));
    return NextResponse.json({ ok: false, failedStep: step, error, done }, { status: 502 });
  };

  if (body.special) {
    const r = await addSpecialToVenue(row.venueId, body.special);
    if (!r.ok) return fail("special", r.error);
    done.push(r.alreadyThere ? "special already on the listing" : "special added");
  }
  if (body.phone) {
    const r = await setVenuePhone(row.venueId, body.phone);
    if (!r.ok) return fail("phone", r.error);
    done.push(r.unchanged ? "phone already correct" : "phone updated");
  }
  if (body.reply !== null) {
    const subject = (inbound.subject ?? "").replace(/^\s*(re:\s*)+/i, "").trim() || "Votre fiche";
    const r = await sendInboxReply({ venueId: row.venueId, toEmail: inbound.fromEmail, subject: `Re: ${subject}`, body: body.reply.trim() });
    if (!r.ok) return fail("reply", r.error);
    done.push("reply sent");
  }

  await db.update(inboxProposals).set({ status: "applied", decidedAt: new Date(), error: null }).where(eq(inboxProposals.id, proposalId));
  return NextResponse.json({ ok: true, done });
}
