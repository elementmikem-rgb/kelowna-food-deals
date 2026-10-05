"use client";

import { useState } from "react";
import { reviewResultSchema } from "@/lib/submission-review-schema";
import { formatPrice } from "@/lib/format";
import type { SimilarVenue } from "@/lib/string-similarity";

interface SubmissionRowData {
  id: number;
  venueName: string;
  venueAddress: string | null;
  isNewVenue: boolean;
  isPriority: boolean;
  rawText: string | null;
  hasPhoto: boolean;
  aiExtracted: unknown;
  aiNotes: string | null;
  resolvedItemKeys: string[];
  createdAt: string;
}

type ItemType = "special" | "event" | "menuItem";

function ItemCard({
  submissionId,
  itemType,
  itemIndex,
  title,
  subtitle,
  description,
  confidence,
  notes,
  onResolved,
}: {
  submissionId: number;
  itemType: ItemType;
  itemIndex: number;
  title: string;
  subtitle: string;
  description: string | null;
  confidence: number;
  notes: string | null;
  onResolved: (key: string) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const key = `${itemType}:${itemIndex}`;

  async function act(action: "approve" | "reject") {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemType, itemIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setState("done");
      onResolved(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setState("idle");
    }
  }

  if (state === "done") return null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-2">{itemType}</span>
        <span className="text-[10px] text-muted-2">confidence {confidence.toFixed(2)}</span>
      </div>
      <p className="text-sm font-medium text-foreground/90">{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
      {description && <p className="text-xs text-muted">{description}</p>}
      {notes && <p className="text-xs text-stale">note: {notes}</p>}
      {error && <p className="text-xs text-stale">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => act("approve")}
          disabled={state === "loading"}
          className="press-pill rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => act("reject")}
          disabled={state === "loading"}
          className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function DismissButton({ submissionId, onDismissed }: { submissionId: number; onDismissed: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dismiss() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onDismissed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      <button
        onClick={dismiss}
        disabled={loading}
        className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
      >
        Dismiss
      </button>
      {error && <p className="text-xs text-stale">{error}</p>}
    </div>
  );
}

// Editable name/address for a new-venue submission, plus a "possible existing venue"
// warning computed server-side (lib/string-similarity.ts) against every active venue
// already in this region. Previously the submitter's free-text name/address was
// read-only here -- a typo or shortened name either had to be fixed directly in the DB
// after the fact, or (worse) slipped past findOrCreateVenue's exact-match check and
// created a duplicate venue row for a place that was already listed.
function NewVenueInfo({
  submissionId,
  venueName,
  venueAddress,
  similarVenues,
  onLinked,
}: {
  submissionId: number;
  venueName: string;
  venueAddress: string | null;
  similarVenues: SimilarVenue[];
  onLinked: (fullyResolved: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(venueName);
  const [address, setAddress] = useState(venueAddress ?? "");
  const [savedName, setSavedName] = useState(venueName);
  const [savedAddress, setSavedAddress] = useState(venueAddress);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState<number | null>(null);
  const [linkedToName, setLinkedToName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Once the admin edits the name, the server-computed similarity list (based on the
  // ORIGINAL submitted name) may no longer be relevant -- hide it rather than show
  // stale suggestions for a name that's since changed.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  async function save() {
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_venue_info",
          venueName: name.trim(),
          venueAddress: address.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSavedName(name.trim());
      setSavedAddress(address.trim() || null);
      setSuggestionsDismissed(true);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function linkExisting(targetVenueId: number) {
    setLinking(targetVenueId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link_existing_venue", venueId: targetVenueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const target = similarVenues.find((v) => v.id === targetVenueId);
      setLinkedToName(target?.name ?? "the existing venue");
      onLinked(!!data.fullyResolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLinking(null);
    }
  }

  if (linkedToName) {
    return <p className="text-xs text-muted-2">Linked to existing venue: {linkedToName}.</p>;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-2" htmlFor={`name-${submissionId}`}>
            Venue name
          </label>
          <input
            id={`name-${submissionId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-2" htmlFor={`address-${submissionId}`}>
            Address
          </label>
          <input
            id={`address-${submissionId}`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        </div>
        {error && <p className="text-xs text-stale">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="press-pill rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setName(savedName);
              setAddress(savedAddress ?? "");
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
            className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {savedAddress && <p className="text-xs text-muted-2">{savedAddress}</p>}
        <button
          onClick={() => setEditing(true)}
          className="press-pill rounded-full border border-border px-2 py-0.5 text-[10px] text-muted"
        >
          Edit name/address
        </button>
      </div>
      {error && <p className="text-xs text-stale">{error}</p>}
      {!suggestionsDismissed && similarVenues.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-gold/40 bg-gold/10 p-3">
          <p className="text-xs text-gold font-medium">
            Possible duplicate -- this region already has a similarly-named venue:
          </p>
          {similarVenues.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground/90">
                {v.name} <span className="text-muted-2">({Math.round(v.score * 100)}% match)</span>
              </span>
              <button
                onClick={() => linkExisting(v.id)}
                disabled={linking !== null}
                className="press-pill rounded-full border border-gold px-2 py-0.5 text-[10px] text-gold disabled:opacity-50"
              >
                {linking === v.id ? "Linking…" : "Use this venue instead"}
              </button>
            </div>
          ))}
          <button
            onClick={() => setSuggestionsDismissed(true)}
            className="self-start text-[10px] text-muted-2 underline"
          >
            Not a duplicate, dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// The only way to publish a new-venue submission that has no specific special/event/menu
// item attached (a submitter who just wants the venue itself added) -- "approve" only
// exists per-item, so without this action there was no way to create the venue at all,
// only "dismiss" (which rejects it). See create_venue in the API route.
function CreateVenueButton({
  submissionId,
  onCreated,
}: {
  submissionId: number;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_venue" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      <button
        onClick={create}
        disabled={loading}
        className="press-pill rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
      >
        Create venue
      </button>
      {error && <p className="text-xs text-stale">{error}</p>}
    </div>
  );
}

// Saves the submission's photo as a venue photo without touching any specials/events --
// the only approve path for a known-venue, text-free submission (the owner dashboard's
// "attach a photo" flow, see app/api/owner/photo-submission/route.ts), which never runs
// AI extraction since there's no free text to parse a special/event out of.
function ApprovePhotoButton({
  submissionId,
  onApproved,
}: {
  submissionId: number;
  onApproved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_photo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      <button
        onClick={approve}
        disabled={loading}
        className="press-pill rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
      >
        Approve photo
      </button>
      {error && <p className="text-xs text-stale">{error}</p>}
    </div>
  );
}

export function AdminSubmissionRow({
  submission,
  similarVenues = [],
}: {
  submission: SubmissionRowData;
  similarVenues?: SimilarVenue[];
}) {
  const [resolvedKeys, setResolvedKeys] = useState<string[]>(submission.resolvedItemKeys);
  const [showPhoto, setShowPhoto] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // aiExtracted is a jsonb column, so its shape is only whatever was written at
  // extraction time — parse it rather than asserting it.
  const parsedExtract =
    submission.aiExtracted === null || submission.aiExtracted === undefined
      ? null
      : reviewResultSchema.safeParse(submission.aiExtracted);
  const extracted = parsedExtract?.success ? parsedExtract.data : null;
  const extractUnreadable = parsedExtract !== null && !parsedExtract.success;

  const specials = extracted?.specials ?? [];
  const eventsList = extracted?.events ?? [];
  const menuItemsList = extracted?.menu_items ?? [];
  const totalItems = specials.length + eventsList.length + menuItemsList.length;
  const remaining = totalItems - resolvedKeys.length;

  // An item auto-rejected at submit time (a duplicate of something already
  // archived -- see app/api/submit/route.ts's suppressedSpecialIndices/
  // suppressedEventIndices) is recorded as "rejected:special:0", not
  // "special:0". Checking only the bare key here would keep showing that
  // item as an actionable card even though the server already resolved it
  // (and would 409 if approved again) -- match both forms, same as the
  // server's own resolved-check.
  function isResolved(key: string): boolean {
    return resolvedKeys.includes(key) || resolvedKeys.includes(`rejected:${key}`);
  }

  if (dismissed) return null;
  // Only hide once there WERE items and every one got resolved (auto-approved/rejected or
  // resolved here). A submission with zero extracted items also computes remaining <= 0
  // (0 total - 0 resolved), but that means nothing was ever auto-resolved -- it still needs
  // a human to look at the raw text/photo, so it must stay visible, not disappear silently.
  const allItemsResolved = totalItems > 0 && remaining <= 0;
  if (allItemsResolved) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg text-foreground">{submission.venueName}</h3>
          {submission.isPriority && (
            <span className="text-[10px] uppercase tracking-wide font-medium text-gold bg-gold/10 rounded-full px-2 py-0.5">
              Priority
            </span>
          )}
          {submission.isNewVenue && (
            <span className="text-[10px] uppercase tracking-wide font-medium text-accent bg-accent/10 rounded-full px-2 py-0.5">
              New venue
            </span>
          )}
        </div>
        <span className="text-xs text-muted-2">{remaining} pending</span>
      </div>

      {submission.isNewVenue && (
        <NewVenueInfo
          submissionId={submission.id}
          venueName={submission.venueName}
          venueAddress={submission.venueAddress}
          similarVenues={similarVenues}
          onLinked={(fullyResolved) => {
            if (fullyResolved) setDismissed(true);
          }}
        />
      )}

      {submission.rawText && (
        <p className="text-sm text-foreground/90">&ldquo;{submission.rawText}&rdquo;</p>
      )}

      {submission.hasPhoto &&
        (showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/admin/submission-photos/${submission.id}`}
            alt="Submitted"
            className="rounded-lg max-h-64 object-contain border border-border"
          />
        ) : (
          <button
            onClick={() => setShowPhoto(true)}
            className="press-pill self-start rounded-full border border-border px-3 py-1 text-xs text-muted"
          >
            View photo
          </button>
        ))}

      {extractUnreadable && (
        <p className="text-xs text-stale">
          Unable to display extracted data -- the stored AI result doesn&apos;t match the expected
          shape.
        </p>
      )}

      {!extracted && !extractUnreadable && (
        <>
          <p className="text-xs text-stale">
            {submission.hasPhoto && !submission.isNewVenue
              ? "Photo only -- no text to extract a special/event from."
              : submission.aiNotes ?? "AI review failed."}
          </p>
          <div className="flex gap-2">
            {submission.hasPhoto && !submission.isNewVenue && (
              <ApprovePhotoButton submissionId={submission.id} onApproved={() => setDismissed(true)} />
            )}
            <DismissButton submissionId={submission.id} onDismissed={() => setDismissed(true)} />
          </div>
        </>
      )}
      {extractUnreadable && (
        <DismissButton submissionId={submission.id} onDismissed={() => setDismissed(true)} />
      )}
      {extracted && totalItems === 0 && (
        <>
          <p className="text-xs text-stale">
            {submission.aiNotes ?? "AI found nothing to auto-extract -- check the raw text/photo yourself."}
          </p>
          <div className="flex gap-2">
            {submission.isNewVenue && (
              <CreateVenueButton submissionId={submission.id} onCreated={() => setDismissed(true)} />
            )}
            {submission.hasPhoto && !submission.isNewVenue && (
              <ApprovePhotoButton submissionId={submission.id} onApproved={() => setDismissed(true)} />
            )}
            <DismissButton submissionId={submission.id} onDismissed={() => setDismissed(true)} />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        {specials.map((s, i) =>
          isResolved(`special:${i}`) ? null : (
            <ItemCard
              key={`special:${i}`}
              submissionId={submission.id}
              itemType="special"
              itemIndex={i}
              title={s.title}
              subtitle={[
                formatPrice(s.price_cents),
                s.start_time ?? "",
                s.day_of_week !== null ? `day ${s.day_of_week}` : "any day",
              ]
                .filter(Boolean)
                .join(" · ")}
              description={s.description}
              confidence={s.confidence}
              notes={s.notes}
              onResolved={(key) => setResolvedKeys((prev) => [...prev, key])}
            />
          )
        )}
        {eventsList.map((e, i) =>
          isResolved(`event:${i}`) ? null : (
            <ItemCard
              key={`event:${i}`}
              submissionId={submission.id}
              itemType="event"
              itemIndex={i}
              title={e.title}
              subtitle={[e.event_type, e.specific_date ?? "", e.start_time ?? ""]
                .filter(Boolean)
                .join(" · ")}
              description={e.description}
              confidence={e.confidence}
              notes={e.notes}
              onResolved={(key) => setResolvedKeys((prev) => [...prev, key])}
            />
          )
        )}
        {menuItemsList.map((m, i) =>
          isResolved(`menuItem:${i}`) ? null : (
            <ItemCard
              key={`menuItem:${i}`}
              submissionId={submission.id}
              itemType="menuItem"
              itemIndex={i}
              title={m.name}
              subtitle={formatPrice(m.price_cents) ?? ""}
              description={m.description}
              confidence={m.confidence}
              notes={m.notes}
              onResolved={(key) => setResolvedKeys((prev) => [...prev, key])}
            />
          )
        )}
      </div>
    </div>
  );
}
