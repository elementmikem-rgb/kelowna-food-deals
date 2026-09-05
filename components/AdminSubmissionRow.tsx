"use client";

import { useState } from "react";

interface SubmissionRowData {
  id: number;
  venueName: string;
  submissionType: "special" | "event";
  rawText: string | null;
  photoData: string | null;
  photoMimeType: string | null;
  aiExtracted: unknown;
  aiConfidence: number | null;
  aiNotes: string | null;
  createdAt: string;
}

export function AdminSubmissionRow({ submission }: { submission: SubmissionRowData }) {
  const [resolved, setResolved] = useState<"approve" | "reject" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submission.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResolved(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (resolved) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 opacity-50">
        <p className="text-sm text-muted">
          {resolved === "approve" ? "Approved" : "Rejected"} — {submission.venueName}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">{submission.venueName}</h3>
        <span className="text-xs uppercase tracking-wide text-muted-2">
          {submission.submissionType}
        </span>
      </div>

      {submission.rawText && (
        <p className="text-sm text-foreground/90">&ldquo;{submission.rawText}&rdquo;</p>
      )}

      {submission.photoData && submission.photoMimeType && (
        <img
          src={`data:${submission.photoMimeType};base64,${submission.photoData}`}
          alt="Submitted"
          className="rounded-lg max-h-64 object-contain border border-border"
        />
      )}

      {submission.aiExtracted != null && (
        <div className="rounded-lg bg-surface-raised p-3 text-xs font-mono-tabular whitespace-pre-wrap">
          {JSON.stringify(submission.aiExtracted, null, 2)}
        </div>
      )}

      <p className="text-xs text-muted">
        AI confidence: {submission.aiConfidence?.toFixed(2) ?? "n/a"}
        {submission.aiNotes ? ` — ${submission.aiNotes}` : ""}
      </p>

      {error && <p className="text-xs text-stale">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={loading}
          className="rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => act("reject")}
          disabled={loading}
          className="rounded-full border border-border px-4 py-1.5 text-sm text-muted disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
