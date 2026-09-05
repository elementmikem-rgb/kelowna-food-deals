"use client";

import { useState } from "react";

interface InboxEmail {
  id: number;
  venueName: string | null;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  textBody: string | null;
  read: boolean;
  receivedAt: string;
}

export function AdminInboxRow({ email }: { email: InboxEmail }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleReply() {
    if (!replyText.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/admin/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboundEmailId: email.id, replyText }),
      });
      if (!res.ok) throw new Error();
      setState("sent");
      setReplyOpen(false);
    } catch {
      setState("error");
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground/90">
            {email.fromName ?? email.fromEmail}
            {email.venueName && (
              <span className="text-muted-2 font-normal"> — {email.venueName}</span>
            )}
          </p>
          <p className="text-xs text-muted-2">{email.fromEmail}</p>
        </div>
        <span className="text-[11px] text-muted-2 shrink-0">
          {new Date(email.receivedAt).toLocaleString()}
        </span>
      </div>

      {email.subject && <p className="text-sm text-foreground/90">{email.subject}</p>}
      {email.textBody && (
        <p className="text-sm text-muted whitespace-pre-wrap">{email.textBody}</p>
      )}

      {!replyOpen ? (
        <button
          onClick={() => setReplyOpen(true)}
          className="press-pill self-start text-xs text-accent-dim underline"
        >
          Reply
        </button>
      ) : (
        <div className="flex flex-col gap-2 mt-1">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Type your reply…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleReply}
              disabled={state === "sending"}
              className="press-pill rounded-full bg-accent text-background px-4 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {state === "sending" ? "Sending…" : "Send reply"}
            </button>
            <button
              onClick={() => setReplyOpen(false)}
              className="text-xs text-muted-2 hover:text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {state === "sent" && <p className="text-xs text-evergreen">Reply sent.</p>}
      {state === "error" && <p className="text-xs text-stale">Failed to send — try again.</p>}
    </article>
  );
}
