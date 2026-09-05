"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "idle" | "sending" | "auto_approved" | "needs_review" | "error";

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
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "event" ? "event" : "special";

  const [venueId, setVenueId] = useState<number | "">("");
  const [submissionType, setSubmissionType] = useState<"special" | "event">(initialType);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
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
          submissionType,
          text: text.trim() || null,
          photoBase64,
          photoMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setStatus(data.status === "auto_approved" ? "auto_approved" : "needs_review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "auto_approved") {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-xl text-foreground mb-1">Published!</p>
        <p className="text-sm text-muted">
          We checked it and it&apos;s live on the site now. Thanks for the tip.
        </p>
      </div>
    );
  }

  if (status === "needs_review") {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-xl text-foreground mb-1">Thanks — sent for a quick check</p>
        <p className="text-sm text-muted">
          We couldn&apos;t auto-verify this one, so it&apos;ll get a human look before it goes live.
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

      <div className="flex gap-2">
        {(["special", "event"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setSubmissionType(t)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
              submissionType === t
                ? "bg-accent text-background border-accent"
                : "bg-transparent text-muted border-border"
            }`}
          >
            {t === "special" ? "Food/drink special" : "Event / live music"}
          </button>
        ))}
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
          placeholder='e.g. "Wing night Tuesdays, $0.75 each, 4-9pm" or "Live music every Friday at 8pm, no cover"'
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="photo">
          Or add a photo (menu board, sign, poster)
        </label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="text-sm text-muted"
        />
      </div>

      {error && <p className="text-sm text-stale">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-accent text-background px-5 py-2 text-sm font-medium disabled:opacity-50 self-start"
      >
        {status === "sending" ? "Checking…" : "Submit"}
      </button>
    </form>
  );
}
