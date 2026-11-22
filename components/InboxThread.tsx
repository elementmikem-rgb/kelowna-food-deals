"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { splitQuoted, stripQuotePrefix } from "@/lib/email-quote";
import { cleanBodyText, tokenizeLinks } from "@/lib/email-display";
import { detectLanguage } from "@/lib/detect-language";
import { joinTranslated, splitForTranslation } from "@/lib/translate-units";
import { fillSnippet, snippetsFor } from "@/lib/inbox-snippets";
import { formatMessageDate } from "@/lib/inbox-format";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  BlockIcon,
  ChevronDownIcon,
  CloseIcon,
  ForwardIcon,
  MailIcon,
  PaperclipIcon,
  ReplyIcon,
  TrashIcon,
  TranslateIcon,
} from "@/components/inbox/icons";

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
      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90">
        <Linkified text={main} />
      </p>
      {quoted && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            title="Show trimmed content"
            className="inline-flex items-center rounded-full border border-border bg-background px-3 py-0.5 text-sm leading-none tracking-widest text-muted-2 transition hover:border-accent-dim/40 hover:text-foreground"
          >
            ···
          </button>
          {expanded && (
            <div className="mt-3 border-l-2 border-border pl-4">
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted-2">
                <Linkified text={stripQuotePrefix(quoted)} />
              </p>
            </div>
          )}
        </div>
      )}
      {after && (
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90">
          <Linkified text={after} />
        </p>
      )}
    </div>
  );
}

// Initials avatar; the tint is derived from the role so a sender keeps the same look everywhere.
function Avatar({ name, outbound, size = 40 }: { name: string; outbound?: boolean; size?: number }) {
  const clean = name.replace(/<.*?>/g, "").trim() || "?";
  const initials = clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        outbound ? "bg-accent text-background" : "bg-accent-soft/60 text-accent-dim"
      }`}
    >
      {initials}
    </span>
  );
}

// Chrome's on-device Translator API (Chrome 138+): free, private, nothing leaves the browser. Absent in
// other browsers, in which case the translate buttons simply do not appear.
interface TranslatorLike {
  translate(text: string): Promise<string>;
}
interface TranslatorStatic {
  availability(opts: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<TranslatorLike>;
}
function getTranslator(): TranslatorStatic | null {
  const t = (globalThis as unknown as { Translator?: TranslatorStatic }).Translator;
  return t ?? null;
}
// Maps a failure to something Mike can act on. Chrome only starts the one-time language-pack download
// from a real click, so a refused download is the common first-use case.
function translateErrorMessage(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") {
    return "Chrome needs a direct click to download the language pack (one time). Click Translate again.";
  }
  if (name === "NotSupportedError") return "Chrome cannot translate this language pair on this device.";
  return "Translation failed. Try again, or use Chrome 138 or newer.";
}

async function translateText(
  text: string,
  from: string,
  to: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const T = getTranslator();
  if (!T) throw new Error("Translator not available");
  const tr = await T.create({
    sourceLanguage: from,
    targetLanguage: to,
    monitor(m) {
      m.addEventListener("downloadprogress", (ev) => {
        const loaded = (ev as unknown as { loaded?: number }).loaded;
        if (typeof loaded === "number") onProgress?.(Math.round(loaded * 100));
      });
    },
  });
  // Translate piece by piece (long inputs are slow and can be truncated) and put the pieces back with the
  // original paragraphs and signature lines, so the translated message keeps its layout.
  const units = splitForTranslation(text);
  const out: string[] = [];
  for (const u of units) out.push(u.translate ? await tr.translate(u.text) : u.text);
  return joinTranslated(units, out);
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
  venueUrl?: string | null;
  archived: boolean;
  messages: Message[];
}

const UNDO_SECONDS = 8;

function plainPreview(m: Message): string {
  const raw = m.bodyText ?? (m.bodyHtml ? m.bodyHtml.replace(/<[^>]+>/g, " ") : "");
  return cleanBodyText(raw).replace(/\s+/g, " ").slice(0, 140);
}

export function InboxThread({ venueId, displayName, contactEmail, venueUrl, archived, messages }: InboxThreadProps) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "sending" | "sent" | "error">("idle");
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SECONDS);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState<{ kind: "unsubscribe" | "block" | "forward" | "delete"; ok: boolean } | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([messages[messages.length - 1]?.id ?? ""]));
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  // False on the server and during hydration, then true in browsers that have the Translator API.
  const canTranslate = useSyncExternalStore(
    () => () => {},
    () => getTranslator() !== null,
    () => false
  );
  const sendTimer = useRef<number | null>(null);
  const tick = useRef<number | null>(null);
  const pendingPayload = useRef<{ subject: string; body: string } | null>(null);

  const inboundIds = messages.filter((m) => m.inboundId !== null).map((m) => m.inboundId!);
  // A thread can span more than one reply-from address for the same venue (rare, but real) --
  // block every distinct sender, not just contactEmail.
  const senderEmails = Array.from(new Set(messages.filter((m) => m.fromEmail).map((m) => m.fromEmail!)));
  const latestSubject = [...messages].reverse().find((m) => m.subject)?.subject ?? `Re: ${displayName}`;
  const firstSubject = messages.find((m) => m.subject)?.subject ?? latestSubject;
  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const lastInboundLang = lastInbound?.bodyText ? detectLanguage(lastInbound.bodyText).lang : "unknown";
  const replyLang: "en" | "fr" = lastInboundLang === "fr" ? "fr" : "en";

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

  async function handleArchive(next: boolean) {
    if (inboundIds.length === 0) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: inboundIds, archived: next }),
      });
      if (res.ok) router.push("/admin/inbox");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    // A thread with no inbound messages yet (outbound-only) still needs its outreachSends rows removed,
    // so only bail when there is truly nothing to delete on either side.
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
    // Only needs to fire once per thread load -- messages is stable for the life of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Undo send: the message is held for a few seconds before the real request goes out. If the tab is
  // closed or navigated away mid-countdown it is sent immediately (keepalive) rather than silently lost.
  const doSend = useCallback(
    async (payload: { subject: string; body: string }, keepalive = false) => {
      setState("sending");
      try {
        const res = await fetch("/api/admin/inbox/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId, toEmail: contactEmail, subject: payload.subject, body: payload.body }),
          keepalive,
        });
        if (!res.ok) throw new Error();
        setState("sent");
        setReplyText("");
        setReplyOpen(false);
        router.refresh();
      } catch {
        setState("error");
      }
    },
    [venueId, contactEmail, router]
  );

  function clearTimers() {
    if (sendTimer.current) window.clearTimeout(sendTimer.current);
    if (tick.current) window.clearInterval(tick.current);
    sendTimer.current = null;
    tick.current = null;
  }

  function handleSend() {
    if (!replyText.trim() || !contactEmail) return;
    // A canned reply with a variable we could not fill (for example {{link}} on an unmatched sender)
    // must never go out as literal braces.
    if (/\{\{\w+\}\}/.test(replyText)) {
      setTranslateError("Fill in or remove the {{placeholder}} before sending.");
      return;
    }
    setTranslateError(null);
    const subject = latestSubject.startsWith("Re:") ? latestSubject : `Re: ${latestSubject}`;
    pendingPayload.current = { subject, body: replyText };
    setState("pending");
    setSecondsLeft(UNDO_SECONDS);
    tick.current = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    sendTimer.current = window.setTimeout(() => {
      clearTimers();
      const p = pendingPayload.current;
      pendingPayload.current = null;
      if (p) void doSend(p);
    }, UNDO_SECONDS * 1000);
  }

  function handleUndo() {
    clearTimers();
    pendingPayload.current = null;
    setState("idle");
  }

  useEffect(() => {
    function flush() {
      const p = pendingPayload.current;
      if (!p) return;
      clearTimers();
      pendingPayload.current = null;
      void doSend(p, true);
    }
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [doSend]);

  async function handleTranslate(m: Message) {
    if (!m.bodyText) return;
    setTranslateError(null);
    if (translated[m.id]) {
      setShowOriginal((prev) => ({ ...prev, [m.id]: !prev[m.id] }));
      return;
    }
    setTranslating(m.id);
    try {
      const { main } = splitQuoted(cleanBodyText(m.bodyText));
      const out = await translateText(main, "fr", "en", setDownloadPct);
      setTranslated((prev) => ({ ...prev, [m.id]: out }));
      setShowOriginal((prev) => ({ ...prev, [m.id]: false }));
    } catch (e) {
      setTranslateError(translateErrorMessage(e));
    } finally {
      setTranslating(null);
      setDownloadPct(null);
    }
  }

  async function handleTranslateDraft() {
    if (!replyText.trim()) return;
    setTranslateError(null);
    try {
      setReplyText(await translateText(replyText, "en", "fr", setDownloadPct));
    } catch (e) {
      setTranslateError(translateErrorMessage(e));
    } finally {
      setDownloadPct(null);
    }
  }

  function insertSnippet(body: string) {
    const first = (lastInbound?.fromLabel ?? "").split(/[\s<]/)[0];
    const filled = fillSnippet(body, {
      name: first && !first.includes("@") ? first : undefined,
      venue: displayName,
      link: venueUrl ?? undefined,
    });
    setReplyText((prev) => (prev.trim() ? `${prev}\n\n${filled}` : filled));
    setSnippetsOpen(false);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const iconBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft/40 hover:text-foreground disabled:opacity-40";
  const pill =
    "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-foreground transition hover:border-accent-dim/50 hover:bg-accent-soft/20 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        <button onClick={() => router.push("/admin/inbox")} title="Back to Inbox" aria-label="Back to Inbox" className={iconBtn}>
          <ArrowLeftIcon />
        </button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <button onClick={() => handleArchive(!archived)} disabled={actionBusy} title={archived ? "Move to Inbox" : "Archive"} aria-label={archived ? "Move to Inbox" : "Archive"} className={iconBtn}>
          <ArchiveIcon />
        </button>
        <button onClick={handleDelete} disabled={actionBusy} title="Delete" aria-label="Delete" className={iconBtn}>
          <TrashIcon />
        </button>
        <button onClick={handleMarkUnread} disabled={actionBusy} title="Mark as unread" aria-label="Mark as unread" className={iconBtn}>
          <MailIcon />
        </button>
        <div className="relative">
          <button onClick={() => setMoreOpen((v) => !v)} disabled={actionBusy} title="More" aria-label="More" className={`${iconBtn} w-auto gap-1 px-3 text-sm`}>
            More <ChevronDownIcon width={14} height={14} />
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-lg">
              {venueId && (
                <button onClick={() => { setMoreOpen(false); void handleUnsubscribe(); }} className="block w-full px-4 py-2 text-left text-danger/80 hover:bg-accent-soft/30 hover:text-danger">
                  Unsubscribe venue
                </button>
              )}
              <button onClick={() => { setMoreOpen(false); void handleBlock(); }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-danger/80 hover:bg-accent-soft/30 hover:text-danger">
                <BlockIcon width={16} height={16} /> Block sender
              </button>
            </div>
          )}
        </div>
        {actionResult && actionResult.kind !== "forward" && (
          <span className={`ml-2 text-xs ${actionResult.ok ? "text-evergreen" : "text-stale"}`}>
            {actionResult.kind === "unsubscribe" && (actionResult.ok ? "Unsubscribed." : "Unsubscribe failed -- try again.")}
            {actionResult.kind === "block" && (actionResult.ok ? "Sender blocked." : "Block failed -- try again.")}
            {actionResult.kind === "delete" && "Delete failed -- try again."}
          </span>
        )}
      </div>

      {/* Subject */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
        <h1 className="font-display text-[26px] leading-tight text-foreground">{firstSubject}</h1>
        <span className="rounded-md bg-accent-soft/50 px-2 py-0.5 text-xs text-accent-dim">{archived ? "Archived" : "Inbox"}</span>
        {lastInboundLang === "fr" && <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted">French</span>}
      </header>

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
            <button onClick={handleForward} disabled={actionBusy || !forwardTo.trim()} className="press-pill self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-background disabled:opacity-50">
              Send forward
            </button>
            <button onClick={() => setForwardOpen(false)} className="text-sm text-muted hover:text-foreground">Cancel</button>
            {actionResult?.kind === "forward" && !actionResult.ok && <span className="text-xs text-stale">Forward failed -- try again.</span>}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {messages.map((m) => {
          const outbound = m.direction === "outbound";
          const open = expanded.has(m.id);
          const name = outbound ? "Mike" : m.fromLabel;
          const lang = m.bodyText ? detectLanguage(m.bodyText).lang : "unknown";
          const tText = translated[m.id];
          const showT = !!tText && !showOriginal[m.id];
          return (
            <article key={m.id} className="border-b border-border last:border-b-0">
              <button
                onClick={() => toggleExpanded(m.id)}
                aria-expanded={open}
                className={`flex w-full items-start gap-3 px-5 text-left ${open ? "pt-5" : "py-3.5 hover:bg-accent-soft/15"}`}
              >
                <Avatar name={name} outbound={outbound} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="truncate text-sm">
                      <span className="font-semibold text-foreground">{outbound ? "You" : m.fromLabel}</span>
                      {open && !outbound && m.fromEmail && <span className="ml-2 text-xs text-muted-2">&lt;{m.fromEmail}&gt;</span>}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-2" suppressHydrationWarning>
                      {outbound && m.clickedAt && <span className="rounded-full bg-accent-soft/40 px-2 py-0.5 text-accent-dim">Clicked</span>}
                      {outbound && m.openedAt && !m.clickedAt && <span className="rounded-full bg-accent-soft/40 px-2 py-0.5 text-accent-dim">Opened</span>}
                      {m.attachments.length > 0 && <PaperclipIcon width={14} height={14} />}
                      {formatMessageDate(m.at)}
                    </span>
                  </span>
                  {!open && <span className="mt-0.5 block truncate text-sm text-muted-2">{plainPreview(m)}</span>}
                  {open && <span className="mt-0.5 block text-xs text-muted-2">{outbound ? "to " + (contactEmail ?? displayName) : "to me"}</span>}
                </span>
              </button>

              {open && (
                <div className="flex flex-col gap-4 px-5 pb-5 pt-3 sm:pl-[68px]">
                  {canTranslate && lang === "fr" && !outbound && (
                    <div className="flex items-center gap-3 rounded-lg bg-accent-soft/25 px-3 py-2 text-xs text-muted">
                      <TranslateIcon width={16} height={16} className="shrink-0" />
                      <span>{showT ? "Showing the English translation." : "This message is in French."}</span>
                      <button onClick={() => handleTranslate(m)} disabled={translating === m.id} className="font-semibold text-accent-dim hover:underline disabled:opacity-50">
                        {translating === m.id ? (downloadPct !== null ? `Downloading language pack ${downloadPct}%` : "Translating…") : tText ? (showOriginal[m.id] ? "Translate to English" : "Show original") : "Translate to English"}
                      </button>
                    </div>
                  )}
                  {translateError && <p className="text-xs text-stale">{translateError}</p>}

                  {showT ? (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90">
                      <Linkified text={tText} />
                    </p>
                  ) : outbound && m.bodyHtml ? (
                    // Safe: outbound HTML is always our own composed content, never sender-supplied --
                    // see lib/inbox-data.ts for why inbound never sets bodyHtml.
                    <div
                      // whitespace-pre-wrap belongs on the plain-text fallback, not here: on injected HTML it
                      // preserves the template's own source whitespace as visible characters, which caused the
                      // mid-word line breaks confirmed live 2026-09-12.
                      className="w-full min-w-0 overflow-x-auto text-sm text-muted [&_a]:text-accent-dim [&_a]:underline"
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
                              <img src={`/api/admin/inbox/attachments/${a.id}`} alt={a.fileName} className="h-14 w-14 rounded-lg object-cover" />
                            ) : (
                              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft/40 text-[11px] font-semibold uppercase text-accent-dim">
                                {a.fileName.split(".").pop()?.slice(0, 4) || "file"}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block max-w-[200px] truncate text-sm font-medium text-foreground">{a.fileName}</span>
                              <span className="block text-xs text-muted-2">
                                {a.sizeBytes >= 1048576 ? `${(a.sizeBytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(a.sizeBytes / 1024))} KB`}
                              </span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Reply area */}
      {contactEmail ? (
        replyOpen ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-md focus-within:border-accent-dim/60">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-2">
              <span className="flex min-w-0 items-center gap-2">
                <ReplyIcon width={16} height={16} />
                <span className="truncate">
                  <span className="font-medium text-foreground">{displayName}</span> &lt;{contactEmail}&gt;
                </span>
              </span>
              <button onClick={() => { setReplyOpen(false); handleUndo(); }} aria-label="Discard draft" title="Discard draft" className={iconBtn}>
                <CloseIcon width={18} height={18} />
              </button>
            </div>
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={7}
              disabled={state === "pending" || state === "sending"}
              placeholder="Write your reply…"
              className="resize-y bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-2 disabled:opacity-60"
            />
            {translateError && <p className="text-xs text-stale">{translateError}</p>}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              {state === "pending" ? (
                <>
                  <span className="text-sm text-muted">Sending in {secondsLeft}s</span>
                  <button onClick={handleUndo} className="text-sm font-semibold text-accent-dim hover:underline">Undo</button>
                </>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={state === "sending" || !replyText.trim()}
                  className="press-pill rounded-full bg-accent px-7 py-2 text-sm font-medium text-background disabled:opacity-50"
                >
                  {state === "sending" ? "Sending…" : "Send"}
                </button>
              )}
              <div className="relative">
                <button onClick={() => setSnippetsOpen((v) => !v)} disabled={state === "pending" || state === "sending"} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-accent-soft/30 hover:text-foreground disabled:opacity-50">
                  Canned replies <ChevronDownIcon width={14} height={14} />
                </button>
                {snippetsOpen && (
                  <div className="absolute bottom-full left-0 z-20 mb-1 max-h-72 w-72 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg">
                    <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-2">{replyLang === "fr" ? "French" : "English"}</p>
                    {snippetsFor(replyLang).map((s) => (
                      <button key={s.id} onClick={() => insertSnippet(s.body)} className="block w-full px-4 py-2 text-left text-sm text-muted hover:bg-accent-soft/30 hover:text-foreground">
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {canTranslate && (
                <button onClick={handleTranslateDraft} disabled={!replyText.trim() || state === "pending" || state === "sending"} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-accent-soft/30 hover:text-foreground disabled:opacity-50">
                  <TranslateIcon width={16} height={16} /> English to French
                </button>
              )}
              {state === "error" && <p className="text-xs text-stale">Failed to send -- try again.</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { setReplyOpen(true); setState("idle"); }} className={pill}>
              <ReplyIcon width={18} height={18} /> Reply
            </button>
            <button onClick={() => setForwardOpen((v) => !v)} className={pill}>
              <ForwardIcon width={18} height={18} /> Forward
            </button>
            {state === "sent" && <span className="text-sm text-evergreen">Message sent.</span>}
          </div>
        )
      ) : (
        <p className="text-sm text-muted-2">No reply address on file for this conversation.</p>
      )}
    </div>
  );
}
