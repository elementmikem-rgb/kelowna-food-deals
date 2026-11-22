import { and, desc, eq } from "drizzle-orm";
import { db, inboxProposals, inboundEmails } from "@/db";
import { parseProposerOutput, type Proposal } from "@/lib/reply-proposal";

// Reads for the admin inbox. A proposal row's JSON is re-validated on the way out, so a hand-edited or malformed row
// can never reach the UI (and then the send button) in an unexpected shape.

export interface PendingProposal {
  id: number;
  confidence: string;
  proposal: Proposal;
  replyToEmail: string;
  createdAt: string;
}

export async function getPendingProposal(venueId: number): Promise<PendingProposal | null> {
  const [row] = await db
    .select({
      id: inboxProposals.id,
      confidence: inboxProposals.confidence,
      proposal: inboxProposals.proposal,
      createdAt: inboxProposals.createdAt,
      fromEmail: inboundEmails.fromEmail,
    })
    .from(inboxProposals)
    .innerJoin(inboundEmails, eq(inboxProposals.inboundEmailId, inboundEmails.id))
    .where(and(eq(inboxProposals.venueId, venueId), eq(inboxProposals.status, "pending")))
    .orderBy(desc(inboxProposals.createdAt))
    .limit(1);
  if (!row) return null;
  const parsed = parseProposerOutput(row.proposal);
  if (!parsed.ok) return null;
  return { id: row.id, confidence: row.confidence, proposal: parsed.value, replyToEmail: row.fromEmail, createdAt: row.createdAt.toISOString() };
}

// Venue ids with a pending proposal, for the "Suggestion" mark in the inbox list.
export async function getPendingProposalVenueIds(): Promise<Set<number>> {
  const rows = await db.select({ venueId: inboxProposals.venueId }).from(inboxProposals).where(eq(inboxProposals.status, "pending"));
  return new Set(rows.flatMap((r) => (r.venueId === null ? [] : [r.venueId])));
}
