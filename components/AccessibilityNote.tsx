"use client";

import { useState } from "react";
import { ACCESS_ANSWERS, ACCESS_FEATURES, type AccessAnswer, type AccessFeature, type AccessShown } from "@/lib/accessibility";
import { accessText } from "@/lib/accessibility-text";
import type { Language } from "@/lib/i18n";

const TOKEN_KEY = "tt_access_token";

// A random id for this browser, so a visitor can change their own answer instead of adding votes.
// It is not an account and says nothing about who the visitor is. If storage is blocked, an
// in-memory id is used for this page view only.
let memoryToken: string | null = null;
function browserToken(): string {
  try {
    const existing = window.localStorage.getItem(TOKEN_KEY);
    if (existing && existing.length >= 16) return existing;
    const fresh = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(TOKEN_KEY, fresh);
    return fresh;
  } catch {
    memoryToken ??= crypto.randomUUID().replace(/-/g, "");
    return memoryToken;
  }
}

// One quiet line under the address (only once enough visitors agree), plus a small link that opens a short form.
export function AccessibilityNote({ venueId, shown, lang = "en" }: { venueId: number; shown: AccessShown[]; lang?: Language }) {
  const T = accessText(lang);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<AccessFeature, AccessAnswer>>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "empty">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(answers).length === 0) return setState("empty");
    setState("sending");
    try {
      const res = await fetch("/api/accessibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, token: browserToken(), answers }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {shown.length > 0 && (
        <p className="text-muted-2">
          {shown.map((s, i) => (
            <span key={s.feature}>
              {i > 0 && " · "}
              {T.feature[s.feature]}, {T.confirmedBy(s.confirmedBy)}
            </span>
          ))}
        </p>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="self-start text-accent-dim underline hover:text-foreground">
          {T.open}
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <p className="text-muted-2">{T.intro}</p>
          {ACCESS_FEATURES.map((f) => (
            <fieldset key={f} className="flex flex-col gap-1.5">
              <legend className="text-foreground">{T.question[f]}</legend>
              <div className="flex flex-wrap gap-2">
                {ACCESS_ANSWERS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={answers[f] === a}
                    onClick={() => setAnswers((prev) => ({ ...prev, [f]: prev[f] === a ? undefined : a }))}
                    className={`press-pill rounded-full border px-3 py-1.5 text-xs ${
                      answers[f] === a ? "border-accent-dim bg-surface-raised text-accent" : "border-border text-muted-2 hover:border-muted"
                    }`}
                  >
                    {T.answer[a]}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={state === "sending" || state === "done"}
              className="press-pill rounded-full bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-dim disabled:opacity-60"
            >
              {state === "sending" ? T.sending : T.send}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-muted-2 underline hover:text-foreground">
              {T.close}
            </button>
            <span role="status" className="text-muted-2">
              {state === "done" ? T.thanks : state === "error" ? T.error : state === "empty" ? T.needOne : ""}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
