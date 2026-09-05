"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

interface SubmitResult {
  status: "auto_approved" | "needs_review" | "rejected";
  autoApprovedCount: number;
  pendingCount: number;
  totalItems: number;
}

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",", 2);
      resolve({ data: base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SubmitForm({ venues }: { venues: { id: number; name: string }[] }) {
  const [venueId, setVenueId] = useState<number | "">("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!venueId) {
      setError("Pick a venue.");
      return;
    }
    if (!text.trim() && !photo) {
      setError("Add a description or a photo.");
      return;
    }

    setStatus("sending");
    try {
      let photoBase64: string | null = null;
      let photoMimeType: string | null = null;
      if (photo) {
        const { data, mimeType } = await fileToBase64(photo);
        photoBase64 = data;
        photoMimeType = mimeType;
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          text: text.trim() || null,
          photoBase64,
          photoMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "done" && result) {
    if (result.totalItems === 0) {
      return (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-display text-xl text-foreground mb-1">Couldn&apos;t find anything to publish</p>
          <p className="text-sm text-muted">
            We looked closely but couldn&apos;t confidently pull out a specific special, event, or
            menu item. Try a clearer photo or add a bit more detail in the text.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-xl text-foreground mb-1">
          Found {result.totalItems} thing{result.totalItems === 1 ? "" : "s"}
        </p>
        <p className="text-sm text-muted">
          {result.autoApprovedCount > 0 &&
            `${result.autoApprovedCount} published immediately. `}
          {result.pendingCount > 0 &&
            `${result.pendingCount} sent for a quick human check before going live.`}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="venue">
          Venue
        </label>
        <select
          id="venue"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : "")}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Select a venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="text">
          What did you see?
        </label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder='e.g. "Wing night Tuesdays, $0.75 each, 4-9pm" or "Live music every Friday at 8pm, no cover" — or just add a photo below'
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="photo">
          Or add a photo — a menu board, chalkboard, flyer, even a whole bulletin board
        </label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="text-sm text-muted"
        />
        <p className="text-xs text-muted-2">
          We&apos;ll pull out every special, event, and menu item we can clearly see — no need to
          pick a type, and no need to crop to just one thing.
        </p>
      </div>

      {error && <p className="text-sm text-stale">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="press-pill rounded-full bg-accent text-background px-5 py-2 text-sm font-medium disabled:opacity-50 self-start"
      >
        {status === "sending" ? "Checking…" : "Submit"}
      </button>
    </form>
  );
}
