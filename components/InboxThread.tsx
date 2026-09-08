"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  direction: "outbound" | "inbound";
  fromLabel: string;
  fromEmail: string | null;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  at: string;
  inboundId: number | null;
  attachments: { id: number; fileName: string; contentType: string; sizeBytes: number }[];
}

interface InboxThreadProps {
  threadKey: string;
  venueId: number | null;
  displayName: string;
  contactEmail: string | null;
  archived: boolean;
  messages: Message[];
}

export function InboxThread({ venueId, displayName, contactEmail, archived, messages }: InboxThreadProps) {
  const [replyText, setReplyText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState<{ kind: "unsubscribe" | "block" | "forward" | "delete"; ok: boolean } | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const router = useRouter();

  const inboundIds = messages.filter((m) => m.inboundId !== null).map((m) => m.inboundId!);
  // A thread can span more than one reply-from address for the same venue
  // (rare, but real) -- block every distinct sender, not just contactEmail.
  const senderEmails = Array.from(
    new Set(messages.filter((m) => m.fromEmail).map((m) => m.fromEmail!))
  );

  async function handleMarkUnread() {
    if (inboundIds.length === 0) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: inboundIds, read: false }),
      });
      if (res.ok) router.push("/admin/inbox");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleArchive(archived: boolean) {
    if (inboundIds.length === 0) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: inboundIds, archived }),
      });
      if (res.ok) router.push("/admin/inbox");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    // A thread with no inbound messages yet (outbound-only) still needs its
    // outreachSends rows removed, so don't bail out on an empty inboundIds --
    // only bail when there's truly nothing to delete on either side.
    if (inboundIds.length === 0 && !venueId && !contactEmail) return;
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: inboundIds, venueId, contactEmail }),
      });
      if (res.ok) router.push("/admin/inbox");
      else setActionResult({ kind: "delete", ok: false });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUnsubscribe() {
    if (!venueId) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });
      setActionResult({ kind: "unsubscribe", ok: res.ok });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleBlock() {
    // contactEmail alone misses a thread with more than one reply-from
    // address -- send every distinct sender address seen in this thread.
    const emails = senderEmails.length > 0 ? senderEmails : contactEmail ? [contactEmail] : [];
    if (emails.length === 0) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      setActionResult({ kind: "block", ok: res.ok });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleForward() {
    if (!forwardTo.trim()) return;
    const original = [...messages].reverse().find((m) => m.direction === "inbound");
    if (!original) return;
    setActionBusy(true);
    try {
      const quoted = `${forwardNote ? forwardNote + "\n\n" : ""}---- Forwarded message ----\nFrom: ${original.fromLabel}\n\n${original.bodyText ?? ""}`;
      const res = await fetch("/api/admin/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: null,
          toEmail: forwardTo.trim(),
          subject: original.subject?.startsWith("Fwd:") ? original.subject : `Fwd: ${original.subject ?? displayName}`,
          body: quoted,
          persist: false,
        }),
      });
      setActionResult({ kind: "forward", ok: res.ok });
      if (res.ok) {
        setForwardOpen(false);
        setForwardTo("");
        setForwardNote("");
      }
    } finally {
      setActionBusy(false);
    }
  }

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

      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
        <button onClick={handleMarkUnread} disabled={actionBusy} className="text-xs text-muted hover:text-foreground px-2 py-1.5 disabled:opacity-50">
          Mark unread
        </button>
        <button onClick={() => handleArchive(!archived)} disabled={actionBusy} className="text-xs text-muted hover:text-foreground px-2 py-1.5 disabled:opacity-50">
          {archived ? "Unarchive" : "Archive"}
        </button>
        <button onClick={handleDelete} disabled={actionBusy} className="text-xs text-danger/80 hover:text-danger px-2 py-1.5 disabled:opacity-50">
          Delete
        </button>
        <button onClick={() => setForwardOpen((v) => !v)} disabled={actionBusy} className="text-xs text-muted hover:text-foreground px-2 py-1.5 disabled:opacity-50">
          Forward
        </button>
        {venueId && (
          <button onClick={handleUnsubscribe} disabled={actionBusy} className="text-xs text-danger/80 hover:text-danger px-2 py-1.5 disabled:opacity-50">
            Unsubscribe
          </button>
        )}
        <button onClick={handleBlock} disabled={actionBusy} className="text-xs text-danger/80 hover:text-danger px-2 py-1.5 disabled:opacity-50">
          Block sender
        </button>
        {actionResult && actionResult.kind !== "forward" && (
          <span className={`text-xs ${actionResult.ok ? "text-evergreen" : "text-stale"}`}>
            {actionResult.kind === "unsubscribe" &&
              (actionResult.ok ? "Unsubscribed." : "Unsubscribe failed — try again.")}
            {actionResult.kind === "block" &&
              (actionResult.ok ? "Sender blocked." : "Block failed — try again.")}
            {actionResult.kind === "delete" && "Delete failed — try again."}
          </span>
        )}
      </div>

      {forwardOpen && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <input
            type="email"
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="Forward to email…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={forwardNote}
            onChange={(e) => setForwardNote(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleForward}
              disabled={actionBusy || !forwardTo.trim()}
              className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Send forward
            </button>
            {actionResult?.kind === "forward" && !actionResult.ok && (
              <span className="text-xs text-stale">Forward failed — try again.</span>
            )}
          </div>
        </div>
      )}

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
                className="text-sm text-muted whitespace-pre-wrap overflow-x-auto w-full min-w-0 [&_a]:text-accent-dim [&_a]:underline"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
              />
            ) : (
              <p className="text-sm text-muted whitespace-pre-wrap">{m.bodyText}</p>
            )}
            {m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {m.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/admin/inbox/attachments/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-accent-dim hover:underline"
                  >
                    {a.contentType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/admin/inbox/attachments/${a.id}`}
                        alt={a.fileName}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : null}
                    <span>
                      {a.fileName} ({Math.round(a.sizeBytes / 1024)}KB)
                    </span>
                  </a>
                ))}
              </div>
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
