"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SpecialSuggestion } from "@/lib/reply-prefill";
import { specialCategory, type SpecialCategory } from "@/db/schema";

// "Apply from the reply" controls in the venue panel. Nothing is written until the admin reviews the values and
// confirms; each button explains what will change on the public listing.

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_LABELS: Record<SpecialCategory, string> = {
  happy_hour: "Happy hour",
  food_special: "Food special",
  wing_night: "Wing night",
  other: "Other",
};

async function post(body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch("/api/admin/inbox/venue-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { ok: false, data: {} };
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

export function UsePhoneButton({ venueId, venueName, phone, current }: { venueId: number; venueName: string; phone: string; current: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function apply() {
    const msg = current
      ? `Change ${venueName}'s public phone number from ${current} to ${phone}?`
      : `Set ${venueName}'s public phone number to ${phone}?`;
    if (!window.confirm(msg)) return;
    setState("busy");
    const { ok } = await post({ action: "set_phone", venueId, phone });
    setState(ok ? "done" : "error");
    if (ok) router.refresh();
  }

  if (state === "done") return <span className="text-xs text-evergreen">Phone updated</span>;
  return (
    <span className="flex items-center gap-2">
      <button
        onClick={apply}
        disabled={state === "busy"}
        className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition hover:border-accent-dim/50 hover:text-foreground disabled:opacity-50"
      >
        {state === "busy" ? "Saving…" : "Use this phone"}
      </button>
      {state === "error" && <span className="text-xs text-stale">Could not save.</span>}
    </span>
  );
}

export function AddSpecialForm({
  venueId,
  venueName,
  suggestion,
}: {
  venueId: number;
  venueName: string;
  suggestion: SpecialSuggestion | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(suggestion?.title ?? "");
  const [description, setDescription] = useState(suggestion?.description ?? "");
  const [days, setDays] = useState<number[]>(suggestion?.daysOfWeek ?? []);
  const [startTime, setStartTime] = useState(suggestion?.startTime ?? "");
  const [endTime, setEndTime] = useState(suggestion?.endTime ?? "");
  const [price, setPrice] = useState(suggestion?.priceCents != null ? (suggestion.priceCents / 100).toString() : "");
  const [category, setCategory] = useState<SpecialCategory>(suggestion?.category ?? "other");

  const everyDay = days.length === 0 || days.length === 7;
  const priceNumber = price.trim() === "" ? null : Number(price);
  const priceInvalid = priceNumber !== null && (!Number.isFinite(priceNumber) || priceNumber < 0 || priceNumber > 1000);
  const canSave = title.trim().length > 0 && !priceInvalid && state !== "busy";

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  async function save() {
    const when = everyDay ? "every day" : days.map((d) => DAY_LABELS[d]).join(", ");
    const money = priceNumber !== null ? `, $${priceNumber}` : "";
    if (!window.confirm(`Add "${title.trim()}" (${when}${money}) to ${venueName}'s public listing now? Visitors will see it.`)) return;
    setState("busy");
    const { ok, data } = await post({
      action: "add_special",
      venueId,
      special: {
        title: title.trim(),
        description: description.trim() || null,
        priceCents: priceNumber !== null ? Math.round(priceNumber * 100) : null,
        daysOfWeek: days,
        startTime: startTime || null,
        endTime: endTime || null,
        category,
      },
    });
    if (!ok) {
      setState("error");
      setMessage(typeof data.error === "string" ? data.error : "Could not save.");
      return;
    }
    setState("done");
    setMessage(data.alreadyThere ? "That special is already on the listing." : `Added ${data.added} special${data.added === 1 ? "" : "s"} to the listing.`);
    router.refresh();
  }

  if (state === "done") {
    return <p className="rounded-xl bg-evergreen/10 px-3 py-2 text-sm text-evergreen">{message}</p>;
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-fit rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-accent-dim/50"
      >
        {suggestion ? "Add a special from this reply" : "Add a special"}
      </button>
    );
  }

  const field = "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent-dim";
  const lab = "text-[11px] font-medium uppercase tracking-wider text-muted-2";
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-2">
        {suggestion ? "Pre-filled from the reply. Check every field before saving." : "Fill in the special."}
      </p>
      <label className="flex flex-col gap-1">
        <span className={lab}>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={field} />
      </label>
      <div className="flex flex-col gap-1">
        <span className={lab}>Days {everyDay && <span className="normal-case tracking-normal">(none selected means every day)</span>}</span>
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(i)}
              aria-pressed={days.includes(i)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                days.includes(i) ? "border-accent bg-accent text-background" : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={lab}>From</span>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lab}>To</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={field} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={lab}>Price ($)</span>
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="none" className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lab}>Type</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as SpecialCategory)} className={field}>
            {specialCategory.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={lab}>Details (optional)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={300} className={`${field} resize-none`} />
      </label>
      {priceInvalid && <p className="text-xs text-stale">Price must be a number.</p>}
      {state === "error" && <p className="text-xs text-stale">{message}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!canSave}
          className="press-pill rounded-full bg-accent px-5 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {state === "busy" ? "Saving…" : "Save to listing"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}
