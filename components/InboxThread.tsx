"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { splitQuoted, stripQuotePrefix } from "@/lib/email-quote";
import { cleanBodyText, tokenizeLinks } from "@/lib/email-display";

function Linkified({ text }: { text: string }) {
  return (
    <>
      {tokenizeLinks(text).map((t, i) =>
        t.type === "link" ? (
          <a
            key={i}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            title={t.href}
            className="text-accent-dim underline decoration-accent-dim/30 underline-offset-2 hover:decoration-accent-dim"
          >
            {t.label}
          </a>
        ) : (
          <span key={i}>{t.value}</span>
        )
      )}
    </>
  );
}

function MessageBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const { main, quoted, after } = splitQuoted(cleanBodyText(text));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
        <Linkified text={main} />
      </p>
      {quoted && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-2 transition hover:border-accent-dim/40 hover:text-foreground"
          >
            <span aria-hidden className="tracking-widest">{expanded ? "−" : "···"}</span>
            {expanded ? "Hide earlier messages" : "Show earlier messages"}
          </button>
          {expanded && (
            <div className="mt-3 border-l-2 border-border pl-4">
              <p className="text-[13px] leading-relaxed text-muted-2 whitespace-pre-wrap break-words">
                <Linkified text={stripQuotePrefix(quoted)} />
              </p>
            </div>
          )}
        </div>
      )}
      {after && (
        <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
          <Linkified text={after} />
        </p>
      )}
    </div>
  );
}

// Initials avatar; the tint is derived from the name so a sender keeps the same color everywhere.
function Avatar({ name, outbound, size = 36 }: { name: string; outbound?: boolean; size?: number }) {
  const clean = name.replace(/<.*?>/g, "").trim() || "?";
  const initials = clean.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
        outbound ? "bg-accent text-background" : "bg-accent-soft/60 text-accent-dim"
      }`}
    >
      {initials}
    </span>
  );
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  openedAt: string | null;
  clickedAt: string | null;
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

  const btn =
    "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent-dim/40 hover:text-foreground disabled:opacity-50";
  const btnDanger =
    "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-danger/80 transition hover:border-danger/40 hover:text-danger disabled:opacity-50";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar name={displayName} size={52} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight text-foreground truncate">{displayName}</h1>
          <p className="mt-0.5 text-sm text-muted-2 truncate">
            {contactEmail ?? "No reply address"}
            <span className="mx-2 text-border">&bull;</span>
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleMarkUnread} disabled={actionBusy} className={btn}>Mark unread</button>
        <button onClick={() => handleArchive(!archived)} disabled={actionBusy} className={btn}>
          {archived ? "Unarchive" : "Archive"}
        </button>
        <button onClick={() => setForwardOpen((v) => !v)} disabled={actionBusy} className={btn}>Forward</button>
        <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />
        {venueId && (
          <button onClick={handleUnsubscribe} disabled={actionBusy} className={btnDanger}>Unsubscribe</button>
        )}
        <button onClick={handleBlock} disabled={actionBusy} className={btnDanger}>Block sender</button>
        <button onClick={handleDelete} disabled={actionBusy} className={btnDanger}>Delete</button>
        {actionResult && actionResult.kind !== "forward" && (
          <span className={`text-xs ${actionResult.ok ? "text-evergreen" : "text-stale"}`}>
            {actionResult.kind === "unsubscribe" &&
              (actionResult.ok ? "Unsubscribed." : "Unsubscribe failed -- try again.")}
            {actionResult.kind === "block" &&
              (actionResult.ok ? "Sender blocked." : "Block failed -- try again.")}
            {actionResult.kind === "delete" && "Delete failed -- try again."}
          </span>
        )}
      </div>

      {forwardOpen && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-2">Forward</p>
          <input
            type="email"
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="Forward to email…"
            className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent-dim"
          />
          <textarea
            value={forwardNote}
            onChange={(e) => setForwardNote(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent-dim"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleForward}
              disabled={actionBusy || !forwardTo.trim()}
              className="press-pill self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              Send forward
            </button>
            {actionResult?.kind === "forward" && !actionResult.ok && (
              <span className="text-xs text-stale">Forward failed -- try again.</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {messages.map((m, idx) => {
          const outbound = m.direction === "outbound";
          // Only show a subject when it changes: repeating "Re: Re: ..." on every card is noise.
          const prevSubject = idx > 0 ? messages[idx - 1].subject : null;
          const showSubject = !!m.subject && m.subject !== prevSubject;
          return (
            <article
              key={m.id}
              className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:p-6 ${
                outbound ? "border-accent-dim/25 bg-accent-soft/10 sm:ml-10" : "border-border bg-surface sm:mr-10"
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar name={outbound ? "Mike" : m.fromLabel} outbound={outbound} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {outbound ? "You" : m.fromLabel}
                    </p>
                    {/* Explicit timeZone -- without it this renders in the SERVER's local time (UTC on
                        Railway) on first paint and the BROWSER's on hydration, which is exactly the React
                        hydration-mismatch error (#418) confirmed live 2026-09-12 on this page. */}
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-2">
                      {outbound && m.clickedAt && (
                        <span className="rounded-full bg-accent-soft/40 px-2 py-0.5 text-accent-dim">Clicked</span>
                      )}
                      {outbound && m.openedAt && !m.clickedAt && (
                        <span className="rounded-full bg-accent-soft/40 px-2 py-0.5 text-accent-dim">Opened</span>
                      )}
                      {formatWhen(m.at)}
                    </span>
                  </div>
                  {!outbound && m.fromEmail && <p className="truncate text-xs text-muted-2">{m.fromEmail}</p>}
                </div>
              </div>

              {showSubject && <p className="text-base font-medium leading-snug text-foreground">{m.subject}</p>}

              {outbound && m.bodyHtml ? (
                // Safe: outbound HTML is always our own composed content, never sender-supplied --
                // see lib/inbox-data.ts for why inbound never sets bodyHtml.
                <div
                  // whitespace-pre-wrap belongs on the plain-text fallback, not here: on injected HTML it
                  // preserves the template's own source whitespace as visible characters, which caused the
                  // mid-word line breaks confirmed live 2026-09-12.
                  className="w-full min-w-0 overflow-x-auto text-sm text-muted [&_a]:text-accent-dim [&_a]:underline"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
                />
              ) : m.bodyText ? (
                <MessageBody text={m.bodyText} />
              ) : null}

              {m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                  {m.attachments.map((a) => {
                    const isImage = a.contentType.startsWith("image/");
                    return (
                      <a
                        key={a.id}
                        href={`/api/admin/inbox/attachments/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-xl border border-border bg-background p-2 pr-4 transition hover:border-accent-dim/40 hover:shadow-sm"
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/admin/inbox/attachments/${a.id}`}
                            alt={a.fileName}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft/40 text-[11px] font-semibold uppercase text-accent-dim">
                            {a.fileName.split(".").pop()?.slice(0, 4) || "file"}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[200px] truncate text-sm font-medium text-foreground">{a.fileName}</span>
                          <span className="block text-xs text-muted-2">
                            {a.sizeBytes >= 1048576
                              ? `${(a.sizeBytes / 1048576).toFixed(1)} MB`
                              : `${Math.max(1, Math.round(a.sizeBytes / 1024))} KB`}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {contactEmail ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm focus-within:border-accent-dim/60">
          <p className="text-xs text-muted-2">
            Reply to <span className="font-medium text-foreground">{displayName}</span> &lt;{contactEmail}&gt;
          </p>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={5}
            placeholder="Write your reply…"
            className="resize-y bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-2"
          />
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <button
              onClick={handleSend}
              disabled={state === "sending" || !replyText.trim()}
              className="press-pill rounded-full bg-accent px-6 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {state === "sending" ? "Sending…" : "Send"}
            </button>
            {state === "sent" && <p className="text-xs text-evergreen">Sent.</p>}
            {state === "error" && <p className="text-xs text-stale">Failed to send -- try again.</p>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-2">No reply address on file for this conversation.</p>
      )}
    </div>
  );
}
