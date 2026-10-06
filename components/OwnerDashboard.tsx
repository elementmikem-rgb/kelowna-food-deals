"use client";

import { useState } from "react";
import { formatPrice, CATEGORY_LABELS, EVENT_TYPE_LABELS } from "@/lib/format";
import { OwnerCart } from "@/components/OwnerCart";
import { OwnerCredits } from "@/components/OwnerCredits";
import { FlashCountdown } from "@/components/FlashCountdown";
import { fileToBase64 } from "@/lib/client-image";

const FLASH_DURATIONS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2 hours" },
  { minutes: 240, label: "4 hours" },
];

interface BookingData {
  id: number;
  productType: "featured" | "boost" | "category_sponsor" | "chat_term_sponsor" | "map_pin";
  status: "pending_payment" | "pending_approval" | "approved" | "rejected" | "expired";
  startDate: string;
  endDate: string;
  priceCents: number;
  creditsSpentCents: number | null;
  createdAt: string | Date;
}

const BOOKING_PRODUCT_LABELS: Record<BookingData["productType"], string> = {
  featured: "Featured",
  boost: "Boost",
  category_sponsor: "Category sponsorship",
  chat_term_sponsor: "Ask-chat term sponsor",
  map_pin: "Map pin boost",
};

// A credit-paid booking skips Stripe entirely and lands in "pending_approval" until an
// admin reviews it (see app/api/owner/cart-checkout/route.ts) -- without this, an owner
// who just spent their credits had zero way to tell whether anything actually happened
// (confirmed live 2026-09-28: neither this dashboard nor anywhere else showed booking
// status at all, credit-paid or not).
function BookingStatusBadge({ status }: { status: BookingData["status"] }) {
  const label: Record<BookingData["status"], string> = {
    pending_payment: "Awaiting payment",
    pending_approval: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
  };
  const tone: Record<BookingData["status"], string> = {
    pending_payment: "border-border text-muted",
    pending_approval: "border-gold/40 bg-gold/10 text-gold",
    approved: "border-evergreen/30 bg-evergreen/10 text-evergreen",
    rejected: "border-danger/30 bg-danger/10 text-danger",
    expired: "border-border text-muted-2",
  };
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${tone[status]}`}>
      {label[status]}
    </span>
  );
}

function BookingHistoryList({ bookings }: { bookings: BookingData[] }) {
  if (bookings.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground/90">Your promotions</span>
        <span className="text-xs text-muted">
          Pending review means an admin still needs to approve it before it goes live.
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {bookings.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-foreground/90">{BOOKING_PRODUCT_LABELS[b.productType]}</span>
              <span className="text-xs text-muted">
                {b.startDate} – {b.endDate} · {b.creditsSpentCents != null ? `${b.creditsSpentCents / 100} credits` : formatPrice(b.priceCents)}
              </span>
            </div>
            <BookingStatusBadge status={b.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface LiveFlashSpecial {
  id: number;
  title: string;
  priceCents: number | null;
  category: string;
  flashExpiresAt: Date;
  flashClaimLimit: number | null;
  flashClaimCount: number;
}

// Separate from SpecialForm/SectionShell above -- a flash special is a different
// kind of thing (urgent, ephemeral, one-at-a-time) from the recurring weekly
// specials list, not a form field on it. See app/owner/venue/[id]/page.tsx's
// comment for why it's filtered out of the regular specials list entirely.
function FlashSpecialWidget({
  venueId,
  live,
  onPosted,
  onEnded,
}: {
  venueId: number;
  live: LiveFlashSpecial | null;
  onPosted: (special: LiveFlashSpecial) => void;
  onEnded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(Object.keys(CATEGORY_LABELS)[0]);
  const [duration, setDuration] = useState(FLASH_DURATIONS[1].minutes);
  const [claimLimit, setClaimLimit] = useState("");
  const [posting, setPosting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/flash-special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          title: title.trim(),
          priceCents: dollarsToCents(price),
          category,
          durationMinutes: duration,
          claimLimit: claimLimit.trim() ? Number(claimLimit) : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      onPosted({
        id: body.id,
        title: title.trim(),
        priceCents: dollarsToCents(price),
        category,
        flashExpiresAt: new Date(body.flashExpiresAt),
        flashClaimLimit: claimLimit.trim() ? Number(claimLimit) : null,
        flashClaimCount: 0,
      });
      setTitle("");
      setPrice("");
      setClaimLimit("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPosting(false);
    }
  }

  async function endEarly() {
    if (!live) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/owner/specials/${live.id}`, { method: "DELETE" });
      if (res.ok) onEnded();
    } finally {
      setEnding(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Flash Special</h2>
      {live ? (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{live.title}</p>
            <span className="text-xs text-danger font-medium">
              <FlashCountdown expiresAt={live.flashExpiresAt} />
            </span>
          </div>
          <p className="text-xs text-muted-2">
            {live.flashClaimLimit !== null
              ? `${live.flashClaimCount} of ${live.flashClaimLimit} claimed`
              : `${live.flashClaimCount} claimed`}
          </p>
          <button
            onClick={endEarly}
            disabled={ending}
            className="press-pill self-start rounded-full border border-danger/50 text-danger px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {ending ? "Ending…" : "End early"}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-2">
          <p className="text-xs text-muted-2">
            Post an urgent, time-limited deal -- shows live on the board and map while it runs.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. First 20 people get a free beer"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price ($, optional)"
              inputMode="decimal"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-36"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              {FLASH_DURATIONS.map((d) => (
                <option key={d.minutes} value={d.minutes}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              value={claimLimit}
              onChange={(e) => setClaimLimit(e.target.value)}
              placeholder="Limit (optional, e.g. 20)"
              inputMode="numeric"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-40"
            />
          </div>
          {error && <p className="text-xs text-stale">{error}</p>}
          <button
            onClick={submit}
            disabled={posting}
            className="press-pill self-start rounded-full bg-danger text-white px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post flash special"}
          </button>
        </div>
      )}
    </section>
  );
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface SpecialData {
  id: number;
  title: string;
  description: string | null;
  priceCents: number | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  category: string;
}

interface EventData {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  coverChargeCents: number | null;
}

interface MenuItemData {
  id: number;
  name: string;
  description: string | null;
  priceCents: number | null;
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToDollars(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toString();
}

// Uploads straight into specials.venue_photos (same table a visitor's /submit photo
// writes to) -- see app/api/owner/venue-photo/route.ts's comment. "Most recent wins"
// (lib/data.ts's venuePhotoId subquery) means a successful upload here is live on the
// specials board card and the venue detail page's photo gallery immediately, with no
// separate "set as cover" step needed.
function VenuePhotoUploader({ venueId, currentPhotoId }: { venueId: number; currentPhotoId: number | null }) {
  const [photoId, setPhotoId] = useState(currentPhotoId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const { data, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/owner/venue-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, photoData: data, photoMimeType: mimeType }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      setPhotoId(body.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Cover photo</h2>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
        {photoId !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/venue-photos/${photoId}`}
            alt=""
            className="h-20 w-20 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="h-20 w-20 rounded-lg bg-surface-raised shrink-0 flex items-center justify-center text-xs text-muted-2">
            None yet
          </div>
        )}
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-sm text-muted">
            Shows on your listing card and your venue page. A clear photo of your space,
            menu, or a recent special works well -- the same thing a visitor's own photo
            submission would show.
          </p>
          <label className="press-pill self-start rounded-full border border-border px-3 py-1.5 text-xs text-muted cursor-pointer">
            {busy ? "Uploading…" : photoId !== null ? "Replace photo" : "Upload a photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {error && <p className="text-xs text-stale">{error}</p>}
        </div>
      </div>
    </section>
  );
}

function SectionShell({
  title,
  children,
  addForm,
}: {
  title: string;
  children: React.ReactNode;
  addForm: React.ReactNode;
}) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">{title}</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          {showAdd ? "Cancel" : "Add new"}
        </button>
      </div>
      {showAdd && <div onClick={(e) => e.stopPropagation()}>{addForm}</div>}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

// Shared by SpecialForm and EventForm -- uploads a photo attached while adding/editing
// either one to the admin review queue (specials.submissions), not live immediately.
// Best-effort: the special/event itself has already saved successfully by the time
// this runs, so a photo upload failure here shouldn't look like the whole save failed.
async function submitPhotoForReview(venueId: number, note: string, file: File): Promise<string | null> {
  try {
    const { data, mimeType } = await fileToBase64(file);
    const res = await fetch("/api/owner/photo-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, note, photoData: data, photoMimeType: mimeType }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error ?? "Photo upload failed";
    }
    return null;
  } catch {
    return "Photo upload failed";
  }
}

function PhotoField({
  photoFile,
  onPhotoFile,
}: {
  photoFile: File | null;
  onPhotoFile: (file: File | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      Photo (optional -- sent to the admin for review before it shows up)
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onPhotoFile(e.target.files?.[0] ?? null)}
        className="text-xs text-muted"
      />
      {photoFile && <span className="text-[11px] text-muted-2">{photoFile.name}</span>}
    </label>
  );
}

function SpecialForm({
  initial,
  venueId,
  onSubmit,
  submitLabel,
}: {
  initial: Omit<SpecialData, "id">;
  venueId: number;
  onSubmit: (data: Omit<SpecialData, "id">) => Promise<void>;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(centsToDollars(initial.priceCents));
  const [dayOfWeek, setDayOfWeek] = useState(initial.dayOfWeek === null ? "" : String(initial.dayOfWeek));
  const [startTime, setStartTime] = useState(initial.startTime?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initial.endTime?.slice(0, 5) ?? "");
  const [category, setCategory] = useState(initial.category);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        priceCents: dollarsToCents(price),
        dayOfWeek: dayOfWeek === "" ? null : Number(dayOfWeek),
        startTime: startTime || null,
        endTime: endTime || null,
        category,
      });
      if (photoFile) {
        const photoError = await submitPhotoForReview(venueId, `${title.trim()} (special)`, photoFile);
        if (photoError) setError(`Saved, but photo upload failed: ${photoError}`);
        else setPhotoFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
      />
      <PhotoField photoFile={photoFile} onPhotoFile={setPhotoFile} />
      <div className="flex flex-wrap gap-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price ($)"
          inputMode="decimal"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-28"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Every day</option>
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-xs text-stale">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function SpecialRow({
  special,
  venueId,
  onSaved,
  onDeleted,
}: {
  special: SpecialData;
  venueId: number;
  onSaved: (id: number, data: Omit<SpecialData, "id">) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    const res = await fetch(`/api/owner/specials/${special.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(special.id);
    else setDeleting(false);
  }

  if (editing) {
    return (
      <SpecialForm
        initial={special}
        venueId={venueId}
        submitLabel="Save"
        onSubmit={async (data) => {
          const res = await fetch(`/api/owner/specials/${special.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Failed");
          onSaved(special.id, data);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground/90">{special.title}</span>
        <span className="text-xs text-muted">
          {[
            CATEGORY_LABELS[special.category] ?? special.category,
            formatPrice(special.priceCents),
            special.dayOfWeek === null ? "Every day" : DAY_LABELS[special.dayOfWeek],
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          Edit
        </button>
        <button
          onClick={del}
          disabled={deleting}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-stale disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function EventForm({
  initial,
  venueId,
  onSubmit,
  submitLabel,
}: {
  initial: Omit<EventData, "id">;
  venueId: number;
  onSubmit: (data: Omit<EventData, "id">) => Promise<void>;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [eventType, setEventType] = useState(initial.eventType);
  const [dayOfWeek, setDayOfWeek] = useState(initial.dayOfWeek === null ? "" : String(initial.dayOfWeek));
  const [specificDate, setSpecificDate] = useState(initial.specificDate ?? "");
  const [startTime, setStartTime] = useState(initial.startTime?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initial.endTime?.slice(0, 5) ?? "");
  const [coverCharge, setCoverCharge] = useState(centsToDollars(initial.coverChargeCents));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        eventType,
        dayOfWeek: dayOfWeek === "" ? null : Number(dayOfWeek),
        specificDate: specificDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        coverChargeCents: dollarsToCents(coverCharge),
      });
      if (photoFile) {
        const photoError = await submitPhotoForReview(venueId, `${title.trim()} (event)`, photoFile);
        if (photoError) setError(`Saved, but photo upload failed: ${photoError}`);
        else setPhotoFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
      />
      <PhotoField photoFile={photoFile} onPhotoFile={setPhotoFile} />
      <div className="flex flex-wrap gap-2">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={dayOfWeek}
          onChange={(e) => {
            setDayOfWeek(e.target.value);
            if (e.target.value !== "") setSpecificDate("");
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">One-off date</option>
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              Weekly {label}
            </option>
          ))}
        </select>
        {dayOfWeek === "" && (
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        )}
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          value={coverCharge}
          onChange={(e) => setCoverCharge(e.target.value)}
          placeholder="Cover ($)"
          inputMode="decimal"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-28"
        />
      </div>
      {error && <p className="text-xs text-stale">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function EventRow({
  event,
  venueId,
  onSaved,
  onDeleted,
}: {
  event: EventData;
  venueId: number;
  onSaved: (id: number, data: Omit<EventData, "id">) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    const res = await fetch(`/api/owner/events/${event.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(event.id);
    else setDeleting(false);
  }

  if (editing) {
    return (
      <EventForm
        initial={event}
        venueId={venueId}
        submitLabel="Save"
        onSubmit={async (data) => {
          const res = await fetch(`/api/owner/events/${event.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Failed");
          onSaved(event.id, data);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground/90">{event.title}</span>
        <span className="text-xs text-muted">
          {[
            EVENT_TYPE_LABELS[event.eventType] ?? event.eventType,
            event.dayOfWeek === null ? event.specificDate : `Weekly ${DAY_LABELS[event.dayOfWeek]}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          Edit
        </button>
        <button
          onClick={del}
          disabled={deleting}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-stale disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function MenuItemForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: Omit<MenuItemData, "id">;
  onSubmit: (data: Omit<MenuItemData, "id">) => Promise<void>;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(centsToDollars(initial.priceCents));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        priceCents: dollarsToCents(price),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price ($)"
        inputMode="decimal"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-28"
      />
      {error && <p className="text-xs text-stale">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function MenuItemRow({
  item,
  onSaved,
  onDeleted,
}: {
  item: MenuItemData;
  onSaved: (id: number, data: Omit<MenuItemData, "id">) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    const res = await fetch(`/api/owner/menu-items/${item.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(item.id);
    else setDeleting(false);
  }

  if (editing) {
    return (
      <MenuItemForm
        initial={item}
        submitLabel="Save"
        onSubmit={async (data) => {
          const res = await fetch(`/api/owner/menu-items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Failed");
          onSaved(item.id, data);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground/90">{item.name}</span>
        {formatPrice(item.priceCents) && (
          <span className="text-xs text-muted">{formatPrice(item.priceCents)}</span>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
        >
          Edit
        </button>
        <button
          onClick={del}
          disabled={deleting}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-stale disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

const emptySpecial: Omit<SpecialData, "id"> = {
  title: "",
  description: null,
  priceCents: null,
  dayOfWeek: null,
  startTime: null,
  endTime: null,
  category: "food_special",
};

const emptyEvent: Omit<EventData, "id"> = {
  title: "",
  description: null,
  eventType: "live_music",
  dayOfWeek: null,
  specificDate: null,
  startTime: null,
  endTime: null,
  coverChargeCents: null,
};

const emptyMenuItem: Omit<MenuItemData, "id"> = { name: "", description: null, priceCents: null };

// A free, organic backlink -- deliberately nothing is exchanged for it (no credit
// bonus), which is what keeps it a real, uncompromised link in Google's eyes instead
// of a "paid link" that would need rel="sponsored" and lose most of its SEO value (see
// the 2026-10-06 conversation this came out of). No live confirm count on the badge
// itself -- a brand new claim has zero confirms, and "0 people confirmed" is a worse
// look than no number at all; the badge is a static, generically-true trust mark, not
// a live stat.
function WebsiteBadgeWidget({
  venueId,
  regionSlug,
  siteUrl,
}: {
  venueId: number;
  regionSlug: string;
  siteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const venueUrl = `${siteUrl}/${regionSlug}/venues/${venueId}`;
  const badgeUrl = `${siteUrl}/api/badge/venue/${venueId}`;
  const snippet = `<a href="${venueUrl}" target="_blank" rel="noopener"><img src="${badgeUrl}" alt="Verified on TodaysTab" width="220" height="48" /></a>`;

  function copy() {
    navigator.clipboard
      .writeText(snippet)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard access can be blocked (permissions, non-HTTPS, browser quirk) --
        // the code is already selected in the textarea below as a fallback, so the
        // owner can still copy it manually with Ctrl/Cmd+C.
      });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG from our own
          API, not a page the Next.js Image optimizer can reach into either way. */}
      <img src={badgeUrl} alt="Verified on TodaysTab" width={220} height={48} className="self-start rounded-full" />
      <textarea
        readOnly
        value={snippet}
        rows={2}
        onClick={(e) => e.currentTarget.select()}
        className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono resize-none text-muted"
      />
      <button
        onClick={copy}
        className="press-pill rounded-full border border-border px-3 py-1.5 text-xs text-foreground/90 self-start"
      >
        {copied ? "Copied!" : "Copy code"}
      </button>
    </div>
  );
}

// One-time welcome banner on an owner's first dashboard visit after their claim is
// approved -- dismissal is per owner ACCOUNT (venueOwners.onboardingSeenAt), not per
// venue, so an owner with multiple claimed venues only sees this once total, not once
// per venue switched to.
function OwnerOnboarding({
  creditBalance,
  venueId,
  regionSlug,
  siteUrl,
  onDismiss,
}: {
  creditBalance: number;
  venueId: number;
  regionSlug: string;
  siteUrl: string;
  onDismiss: () => void;
}) {
  const [dismissing, setDismissing] = useState(false);

  async function dismiss() {
    setDismissing(true);
    const res = await fetch("/api/owner/onboarding-dismiss", { method: "POST" });
    if (res.ok) onDismiss();
    setDismissing(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-accent bg-surface p-4">
      <div className="flex flex-col gap-1">
        <span className="stamp px-2 py-0.5 text-[10px] self-start">Welcome</span>
        <h2 className="font-display text-lg text-foreground">You're all set up</h2>
        <p className="text-sm text-muted">A few things worth knowing:</p>
      </div>
      <ol className="flex flex-col gap-2 text-sm text-foreground/90">
        <li className="flex gap-2">
          <span className="text-muted">1.</span>
          <span>
            Your listing is now yours to manage -- add or edit specials, events, and menu items any time from
            this page.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-muted">2.</span>
          <span>
            You've got <strong>{creditBalance} free credits</strong> (${creditBalance} of value) in your
            account, no strings attached.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-muted">3.</span>
          <span>
            Spend them under <strong>Promote this venue</strong> below -- pin your card to the top of the
            homepage, boost a specific special, or sponsor a category.
          </span>
        </li>
        <li className="flex flex-col gap-2">
          <div className="flex gap-2">
            <span className="text-muted">4.</span>
            <span>
              Optional: add this badge to your own website -- a quick way to show you&apos;re listed here, and it
              links back to your page.
            </span>
          </div>
          <div className="pl-5">
            <WebsiteBadgeWidget venueId={venueId} regionSlug={regionSlug} siteUrl={siteUrl} />
          </div>
        </li>
      </ol>
      <div className="flex items-center gap-2">
        <a
          href="#promote"
          onClick={dismiss}
          className="press-pill rounded-full bg-accent px-3 py-1.5 text-xs text-background"
        >
          Show me
        </a>
        <button
          onClick={dismiss}
          disabled={dismissing}
          className="press-pill rounded-full border border-border px-3 py-1.5 text-xs text-muted disabled:opacity-50"
        >
          Got it, dismiss
        </button>
      </div>
    </section>
  );
}

function DigestPreferenceToggle({ initialOptOut }: { initialOptOut: boolean }) {
  const [optOut, setOptOut] = useState(initialOptOut);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !optOut;
    setSaving(true);
    const res = await fetch("/api/owner/digest-preference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optOut: next }),
    });
    if (res.ok) setOptOut(next);
    setSaving(false);
  }

  return (
    <section className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground/90">Weekly stats email</span>
        <span className="text-xs text-muted">
          {optOut ? "Off -- you won't get weekly view stats." : "On -- a weekly summary of your listing's views."}
        </span>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
      >
        {optOut ? "Turn on" : "Turn off"}
      </button>
    </section>
  );
}

function PasswordSection({ hasPassword: initialHasPassword }: { hasPassword: boolean }) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      setHasPassword(true);
      setEditing(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground/90">Password login</span>
          <span className="text-xs text-muted">
            {hasPassword
              ? "Set -- you can log in with your email and password, or still use an emailed link."
              : "Not set -- you can only log in via an emailed link right now."}
          </span>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
          >
            {hasPassword ? "Change" : "Set a password"}
          </button>
        )}
      </div>
      {editing && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input
            type="password"
            required
            minLength={8}
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
          />
          {error && <p className="text-xs text-stale">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="press-pill rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setPassword("");
                setError(null);
              }}
              disabled={saving}
              className="text-xs text-muted underline disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

interface MonetizationSettings {
  priceCentsPerDay: number;
  minDays: number;
  maxDays: number;
}

export function OwnerDashboard({
  venueId,
  currentPhotoId,
  specials,
  events,
  menuItems,
  weeklyDigestOptOut,
  hasPassword,
  promoteSettings,
  todayISO,
  creditBalance,
  creditBundles,
  showOnboarding,
  liveFlashSpecial,
  bookings,
  regionSlug,
  siteUrl,
  photoAddOn,
  ownedVenues,
  bundleDiscountTiers,
}: {
  venueId: number;
  currentPhotoId: number | null;
  specials: SpecialData[];
  events: EventData[];
  menuItems: MenuItemData[];
  weeklyDigestOptOut: boolean;
  hasPassword: boolean;
  promoteSettings: Record<"featured" | "boost" | "category_sponsor" | "chat_term_sponsor" | "map_pin", MonetizationSettings>;
  todayISO: string;
  creditBalance: number;
  creditBundles: { id: number; name: string; priceCents: number; credits: number }[];
  showOnboarding: boolean;
  liveFlashSpecial: LiveFlashSpecial | null;
  bookings: BookingData[];
  regionSlug: string;
  siteUrl: string;
  // "boost" only -- ported from the public advertise page's checkout, see OwnerCart's
  // own comment. Absent means the add-on isn't configured server-side, not $0.
  photoAddOn?: { priceCentsPerDay: number };
  // See OwnerCart's own comments on both.
  ownedVenues: { id: number; name: string }[];
  bundleDiscountTiers: { minVenues: number; discountPercent: number }[];
}) {
  const [specialList, setSpecialList] = useState(specials);
  const [eventList, setEventList] = useState(events);
  const [menuItemList, setMenuItemList] = useState(menuItems);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [flashSpecial, setFlashSpecial] = useState(liveFlashSpecial);
  // "Overview" is the default landing tab specifically so Promote/credits stay the
  // first thing an owner sees -- same reasoning as moving OwnerCart to the top of the
  // page (see that comment's history): hiding it behind a non-default tab click would
  // reintroduce the exact burial problem that produced 0/18 conversions.
  const [tab, setTab] = useState<"overview" | "manage" | "account">("overview");

  const TABS: { key: typeof tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "manage", label: "Manage listing" },
    { key: "account", label: "Account" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {showOnboarding && !onboardingDismissed && (
        <OwnerOnboarding
          creditBalance={creditBalance}
          venueId={venueId}
          regionSlug={regionSlug}
          siteUrl={siteUrl}
          onDismiss={() => setOnboardingDismissed(true)}
        />
      )}

      <div className="flex gap-1 rounded-full border border-border p-0.5 text-sm self-start">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`press-pill rounded-full px-4 py-1.5 ${tab === t.key ? "bg-accent text-background" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Moved ahead of every content-entry section (Flash Special/Photo/Specials/Events/Menu)
              -- this is the only place the free trial credits (or any purchase) actually convert
              into visibility, and it was previously 6th on the page behind empty-state forms that
              demanded real work first. 0 of 18 claimed owners ever placed a booking with it buried
              there (see the 2026-10-05 funnel audit). */}
          <OwnerCart
            venueId={venueId}
            ownedVenues={ownedVenues}
            bundleDiscountTiers={bundleDiscountTiers}
            specials={specialList.map((s) => ({ id: s.id, title: s.title }))}
            events={eventList.map((e) => ({ id: e.id, title: e.title }))}
            settings={promoteSettings}
            photoAddOn={photoAddOn}
            todayISO={todayISO}
            creditBalance={creditBalance}
          />
          <BookingHistoryList bookings={bookings} />
          <OwnerCredits venueId={venueId} balance={creditBalance} bundles={creditBundles} />
        </>
      )}

      {tab === "manage" && (
        <>
          <FlashSpecialWidget
            venueId={venueId}
            live={flashSpecial}
            onPosted={setFlashSpecial}
            onEnded={() => setFlashSpecial(null)}
          />

          <VenuePhotoUploader venueId={venueId} currentPhotoId={currentPhotoId} />

          <SectionShell
            title="Specials"
            addForm={
              <SpecialForm
                initial={emptySpecial}
                venueId={venueId}
                submitLabel="Add special"
                onSubmit={async (data) => {
                  const res = await fetch("/api/owner/specials", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ venueId, ...data }),
                  });
                  const body = await res.json();
                  if (!res.ok) throw new Error(body.error ?? "Failed");
                  setSpecialList((prev) => [...prev, { id: body.id, ...data }]);
                }}
              />
            }
          >
            {specialList.length === 0 && <p className="text-sm text-muted-2">No specials yet.</p>}
            {specialList.map((s) => (
              <SpecialRow
                key={s.id}
                special={s}
                venueId={venueId}
                onSaved={(id, data) =>
                  setSpecialList((prev) => prev.map((x) => (x.id === id ? { id, ...data } : x)))
                }
                onDeleted={(id) => setSpecialList((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </SectionShell>

          <SectionShell
            title="Events"
            addForm={
              <EventForm
                initial={emptyEvent}
                venueId={venueId}
                submitLabel="Add event"
                onSubmit={async (data) => {
                  const res = await fetch("/api/owner/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ venueId, ...data }),
                  });
                  const body = await res.json();
                  if (!res.ok) throw new Error(body.error ?? "Failed");
                  setEventList((prev) => [...prev, { id: body.id, ...data }]);
                }}
              />
            }
          >
            {eventList.length === 0 && <p className="text-sm text-muted-2">No events yet.</p>}
            {eventList.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                venueId={venueId}
                onSaved={(id, data) =>
                  setEventList((prev) => prev.map((x) => (x.id === id ? { id, ...data } : x)))
                }
                onDeleted={(id) => setEventList((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </SectionShell>

          <SectionShell
            title="Menu"
            addForm={
              <MenuItemForm
                initial={emptyMenuItem}
                submitLabel="Add item"
                onSubmit={async (data) => {
                  const res = await fetch("/api/owner/menu-items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ venueId, ...data }),
                  });
                  const body = await res.json();
                  if (!res.ok) throw new Error(body.error ?? "Failed");
                  setMenuItemList((prev) => [...prev, { id: body.id, ...data }]);
                }}
              />
            }
          >
            {menuItemList.length === 0 && <p className="text-sm text-muted-2">No menu items yet.</p>}
            {menuItemList.map((m) => (
              <MenuItemRow
                key={m.id}
                item={m}
                onSaved={(id, data) =>
                  setMenuItemList((prev) => prev.map((x) => (x.id === id ? { id, ...data } : x)))
                }
                onDeleted={(id) => setMenuItemList((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </SectionShell>
        </>
      )}

      {tab === "account" && (
        <>
          <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground/90">Website badge</span>
              <span className="text-xs text-muted">
                Free, optional -- add this to your own website to show you&apos;re listed here. Same code shown
                when you first claimed this venue.
              </span>
            </div>
            <WebsiteBadgeWidget venueId={venueId} regionSlug={regionSlug} siteUrl={siteUrl} />
          </section>
          <PasswordSection hasPassword={hasPassword} />
          <section className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground/90">Billing</span>
              <span className="text-xs text-muted">Manage your saved card and view invoices.</span>
            </div>
            <a
              href="/api/owner/billing-portal"
              className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted"
            >
              Manage billing
            </a>
          </section>
          <DigestPreferenceToggle initialOptOut={weeklyDigestOptOut} />
        </>
      )}
    </div>
  );
}
