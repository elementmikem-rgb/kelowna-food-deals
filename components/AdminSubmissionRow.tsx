"use client";

import { useState } from "react";
import { reviewResultSchema } from "@/lib/submission-review";
import { formatPrice } from "@/lib/format";

interface SubmissionRowData {
  id: number;
  venueName: string;
  venueAddress: string | null;
  isNewVenue: boolean;
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

export function AdminSubmissionRow({ submission }: { submission: SubmissionRowData }) {
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

  if (dismissed) return null;
  if (extracted && remaining <= 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg text-foreground">{submission.venueName}</h3>
          {submission.isNewVenue && (
            <span className="text-[10px] uppercase tracking-wide font-medium text-accent bg-accent/10 rounded-full px-2 py-0.5">
              New venue
            </span>
          )}
        </div>
        <span className="text-xs text-muted-2">{remaining} pending</span>
      </div>

      {submission.isNewVenue && submission.venueAddress && (
        <p className="text-xs text-muted-2">{submission.venueAddress}</p>
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
          Unable to display extracted data — the stored AI result doesn&apos;t match the expected
          shape.
        </p>
      )}

      {!extracted && !extractUnreadable && (
        <>
          <p className="text-xs text-stale">{submission.aiNotes ?? "AI review failed."}</p>
          <DismissButton submissionId={submission.id} onDismissed={() => setDismissed(true)} />
        </>
      )}
      {extractUnreadable && (
        <DismissButton submissionId={submission.id} onDismissed={() => setDismissed(true)} />
      )}

      <div className="flex flex-col gap-2">
        {specials.map((s, i) =>
          resolvedKeys.includes(`special:${i}`) ? null : (
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
          resolvedKeys.includes(`event:${i}`) ? null : (
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
          resolvedKeys.includes(`menuItem:${i}`) ? null : (
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
