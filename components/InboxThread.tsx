"use client";

import { useEffect, useState } from "react";

interface Message {
  id: string;
  direction: "outbound" | "inbound";
  fromLabel: string;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  at: string;
  inboundId: number | null;
}

interface InboxThreadProps {
  threadKey: string;
  venueId: number | null;
  displayName: string;
  contactEmail: string | null;
  messages: Message[];
}

export function InboxThread({ venueId, displayName, contactEmail, messages }: InboxThreadProps) {
  const [replyText, setReplyText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const unreadIds = messages.filter((m) => m.direction === "inbound" && m.inboundId).map((m) => m.inboundId!);
    if (unreadIds.length === 0) return;
    fetch("/api/admin/inbox/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    }).catch(() => {});
    // Only needs to fire once per thread load — messages is stable for the life of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestSubject = [...messages].reverse().find((m) => m.subject)?.subject ?? `Re: ${displayName}`;

  async function handleSend() {
    if (!replyText.trim() || !contactEmail) return;
    setState("sending");
    try {
      const subject = latestSubject.startsWith("Re:") ? latestSubject : `Re: ${latestSubject}`;
      const res = await fetch("/api/admin/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, toEmail: contactEmail, subject, body: replyText }),
      });
      if (!res.ok) throw new Error();
      setState("sent");
      setReplyText("");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-foreground">{displayName}</h1>
        {contactEmail && <p className="text-sm text-muted-2">{contactEmail}</p>}
      </header>

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <article
            key={m.id}
            className={`rounded-2xl border p-4 flex flex-col gap-2 ${
              m.direction === "outbound"
                ? "border-accent-dim/30 bg-accent-soft/10 ml-8"
                : "border-border bg-surface mr-8"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-foreground/80">{m.fromLabel}</p>
              <span className="text-[11px] text-muted-2">{new Date(m.at).toLocaleString()}</span>
            </div>
            {m.subject && <p className="text-sm font-medium text-foreground/90">{m.subject}</p>}
            {m.direction === "outbound" && m.bodyHtml ? (
              // Safe: outbound HTML is always our own composed content, never
              // sender-supplied — see lib/inbox-data.ts for why inbound never
              // sets bodyHtml.
              <div
                className="text-sm text-muted whitespace-pre-wrap [&_a]:text-accent-dim [&_a]:underline"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
              />
            ) : (
              <p className="text-sm text-muted whitespace-pre-wrap">{m.bodyText}</p>
            )}
          </article>
        ))}
      </div>

      {contactEmail ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder={`Reply to ${displayName}…`}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={state === "sending" || !replyText.trim()}
              className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {state === "sending" ? "Sending…" : "Send"}
            </button>
            {state === "sent" && <p className="text-xs text-evergreen">Sent.</p>}
            {state === "error" && <p className="text-xs text-stale">Failed to send — try again.</p>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-2">No reply address on file for this conversation.</p>
      )}
    </div>
  );
}
