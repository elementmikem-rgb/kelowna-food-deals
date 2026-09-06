"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

interface SubmitResult {
  status: "auto_approved" | "needs_review" | "rejected";
  autoApprovedCount: number;
  pendingCount: number;
  totalItems: number;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_DIMENSION = 1600;

// Phone camera photos are routinely well over the server's 4MB limit, so
// downscale through a canvas before base64-encoding rather than letting the
// upload fail server-side.
async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  const dataUrl = await readAsDataUrl(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image"));
      el.src = dataUrl;
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const resized = canvas.toDataURL("image/jpeg", 0.85);
    const [, base64] = resized.split(",", 2);
    if (!base64) throw new Error("Canvas encode failed");
    return { data: base64, mimeType: "image/jpeg" };
  } catch {
    // Fall back to the original bytes if canvas processing isn't available.
    const [, base64] = dataUrl.split(",", 2);
    return { data: base64, mimeType: file.type };
  }
}

const NEW_VENUE = "__new__";

export function SubmitForm({ venues }: { venues: { id: number; name: string }[] }) {
  const [venueId, setVenueId] = useState<number | "" | typeof NEW_VENUE>("");
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNewVenue = venueId === NEW_VENUE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!venueId) {
      setError("Pick a venue.");
      return;
    }
    if (isNewVenue && !newVenueName.trim()) {
      setError("Add the venue's name.");
      return;
    }
    if (isNewVenue && !newVenueAddress.trim()) {
      setError("Add the venue's address — helps us find and verify it.");
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
          venueId: isNewVenue ? null : venueId,
          venueName: isNewVenue ? newVenueName.trim() : null,
          venueAddress: isNewVenue ? newVenueAddress.trim() : null,
          text: text.trim() || null,
          photoBase64,
          photoMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data);
      setStatus("done");
      window.kdsTrack?.("submission", data.status);
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
          {isNewVenue
            ? "We'll add this venue and verify the details before anything goes live."
            : (
              <>
                {result.autoApprovedCount > 0 &&
                  `${result.autoApprovedCount} published immediately. `}
                {result.pendingCount > 0 &&
                  `${result.pendingCount} sent for a quick human check before going live.`}
              </>
            )}
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
          onChange={(e) =>
            setVenueId(e.target.value === NEW_VENUE ? NEW_VENUE : e.target.value ? Number(e.target.value) : "")
          }
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Select a venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value={NEW_VENUE}>My venue isn&apos;t listed…</option>
        </select>
      </div>

      {isNewVenue && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted" htmlFor="newVenueName">
              Venue name
            </label>
            <input
              id="newVenueName"
              type="text"
              value={newVenueName}
              onChange={(e) => setNewVenueName(e.target.value)}
              placeholder="e.g. The Whatever Pub"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted" htmlFor="newVenueAddress">
              Address
            </label>
            <input
              id="newVenueAddress"
              type="text"
              value={newVenueAddress}
              onChange={(e) => setNewVenueAddress(e.target.value)}
              placeholder="Street address, city"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-muted-2">
            We&apos;ll verify this is a real, current venue before adding it — new venues always
            get a human check first.
          </p>
        </div>
      )}

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
