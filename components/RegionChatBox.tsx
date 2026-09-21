"use client";

import { useEffect, useRef, useState } from "react";

const MAX_QUESTION_LENGTH = 200;
// Mirrors lib/region-chat.ts's MAX_HISTORY_TURNS -- only the last few turns are ever
// sent back to the API, so trimming here too keeps what's stored in sync with what's
// actually usable and avoids holding an ever-growing array for a long-open widget.
const MAX_HISTORY_TURNS = 4;

interface Turn {
  question: string;
  answer: string;
}

export function RegionChatBox({ regionId }: { regionId: number }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || status === "sending") return;
    setStatus("sending");
    setError(null);
    setQuestion("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionId,
          question: trimmed,
          history: turns.slice(-MAX_HISTORY_TURNS),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setTurns((prev) => [...prev, { question: trimmed, answer: data.answer }]);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setTurns([]);
    setQuestion("");
    setError(null);
    setStatus("idle");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask what's on tonight"
        className="press-pill fixed bottom-5 right-5 z-50 flex items-center justify-center gap-2 rounded-full bg-accent text-background shadow-lg h-12 w-12 sm:h-auto sm:w-auto sm:px-5 sm:py-3"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 shrink-0"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span className="hidden sm:inline text-sm font-medium">Ask what's on tonight</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Ask about today</span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close chat"
          className="text-foreground/60 hover:text-foreground text-lg leading-none"
        >
          ×
        </button>
      </div>

      {turns.length > 0 && (
        <div ref={logRef} className="flex flex-col gap-2 px-3 pt-3 max-h-[45vh] overflow-y-auto">
          {turns.map((turn, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-accent-soft px-3 py-1.5 text-sm">
                {turn.question}
              </p>
              <p className="self-start max-w-[85%] text-sm text-foreground/90">{turn.answer}</p>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 flex flex-col gap-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder={turns.length > 0 ? "Ask a follow-up…" : "What's on tonight? Cheapest beer?"}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={status === "sending" || !question.trim()}
            className="press-pill rounded-full bg-accent text-background px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {status === "sending" ? "Asking…" : "Ask"}
          </button>
        </form>

        {error && <p className="text-sm text-stale">{error}</p>}
      </div>
    </div>
  );
}
