"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Proposal } from "@/lib/reply-proposal";
import { formatSpecialSummary } from "@/lib/inbox-venue-format";
import { samePhone } from "@/lib/reply-facts";
import { checkDraftReply } from "@/lib/reply-proposal";

// A suggestion made by scripts/propose-replies.ts from a venue's newest reply. Nothing happens until Mike ticks what
// he wants and clicks Apply, and the dialog spells out exactly what will change and who will get an email.

const INTENT_LABEL: Record<Proposal["intent"], string> = {
  special: "They described a special",
  no_special: "They say they have no special",
  question: "They asked a question",
  unsubscribe: "They want to stop hearing from us",
  other: "No special stated",
};

export function ProposalCard({
  proposalId,
  confidence,
  proposal,
  venueName,
  currentPhone,
  replyToEmail,
}: {
  proposalId: number;
  confidence: string;
  proposal: Proposal;
  venueName: string;
  currentPhone: string | null;
  replyToEmail: string;
}) {
  const router = useRouter();
  const newPhone = proposal.phone && !samePhone(proposal.phone, currentPhone) ? proposal.phone : null;
  const [useSpecial, setUseSpecial] = useState(proposal.special !== null && proposal.confidence !== "low");
  const [usePhone, setUsePhone] = useState(false); // a phone change is never pre-ticked
  const [sendReply, setSendReply] = useState(proposal.intent !== "unsubscribe");
  const [reply, setReply] = useState(proposal.draftReply);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const special = proposal.special;
  const replyProblem = sendReply ? checkDraftReply(reply) : null;
  const nothingChosen = !(useSpecial && special) && !(usePhone && newPhone) && !sendReply;

  async function post(body: unknown) {
    const res = await fetch(`/api/admin/inbox/proposals/${proposalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    return { ok: !!res && res.ok, data: res ? await res.json().catch(() => ({})) : {} };
  }

  async function apply() {
    const lines: string[] = [];
    if (useSpecial && special) lines.push(`Add to ${venueName}'s public listing: ${formatSpecialSummary(special)}`);
    if (usePhone && newPhone) lines.push(`Change the public phone number to ${newPhone}`);
    if (sendReply) lines.push(`Send your reply by email to ${replyToEmail}`);
    if (!window.confirm(`This will:\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\nContinue?`)) return;
    setState("busy");
    const { ok, data } = await post({
      action: "apply",
      special: useSpecial && special ? { ...special } : null,
      phone: usePhone && newPhone ? newPhone : null,
      reply: sendReply ? reply : null,
    });
    if (!ok) {
      setState("error");
      const done = Array.isArray(data.done) && data.done.length ? ` Already done: ${data.done.join(", ")}.` : "";
      setMessage(`${typeof data.error === "string" ? data.error : "Something went wrong."}${done} You can click Apply again.`);
      return;
    }
    setState("done");
    setMessage(Array.isArray(data.done) && data.done.length ? `Done: ${data.done.join(", ")}.` : "Done.");
    router.refresh();
  }

  async function dismiss() {
    setState("busy");
    const { ok } = await post({ action: "dismiss" });
    if (!ok) {
      setState("error");
      setMessage("Could not dismiss it.");
      return;
    }
    setState("done");
    setMessage("Dismissed.");
    router.refresh();
  }

  if (state === "done") {
    return <p className="rounded-2xl border border-border bg-evergreen/10 px-5 py-3 text-sm text-evergreen">{message}</p>;
  }

  const check = "mt-0.5 h-4 w-4 shrink-0";
  return (
    <section aria-label="Suggestion" className="flex flex-col gap-4 rounded-2xl border border-accent-dim/40 bg-accent-soft/20 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-2">Suggested from their reply</p>
          <p className="font-display text-lg text-foreground">{INTENT_LABEL[proposal.intent]}</p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            confidence === "high" ? "bg-evergreen/15 text-evergreen" : confidence === "medium" ? "bg-border/70 text-muted" : "bg-stale/15 text-stale"
          }`}
        >
          {confidence} confidence
        </span>
      </div>

      {special && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={useSpecial} onChange={(e) => setUseSpecial(e.target.checked)} className={check} />
          <span>
            <span className="font-medium text-foreground">Add this special to the listing</span>
            <span className="block text-muted">{formatSpecialSummary(special)}</span>
            {special.description && <span className="block text-xs text-muted-2">{special.description}</span>}
          </span>
        </label>
      )}

      {newPhone && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={usePhone} onChange={(e) => setUsePhone(e.target.checked)} className={check} />
          <span>
            <span className="font-medium text-foreground">Change the phone number to {newPhone}</span>
            <span className="block text-xs text-muted-2">The listing has {currentPhone ?? "none"}. Their number may be a different line, so check first.</span>
          </span>
        </label>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={sendReply} onChange={(e) => setSendReply(e.target.checked)} className={check} />
          <span className="font-medium text-foreground">Send this reply to {replyToEmail}</span>
        </label>
        {sendReply && (
          <>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={9}
              aria-label="Draft reply"
              className="resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent-dim"
            />
            {replyProblem && <p className="text-xs text-stale">This reply cannot be sent: {replyProblem}.</p>}
          </>
        )}
      </div>

      {state === "error" && <p className="text-sm text-stale">{message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={apply}
          disabled={state === "busy" || nothingChosen || !!replyProblem}
          className="press-pill rounded-full bg-accent px-6 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {state === "busy" ? "Working…" : "Apply selected"}
        </button>
        <button onClick={dismiss} disabled={state === "busy"} className="text-sm text-muted hover:text-foreground disabled:opacity-50">
          Dismiss
        </button>
      </div>
    </section>
  );
}
