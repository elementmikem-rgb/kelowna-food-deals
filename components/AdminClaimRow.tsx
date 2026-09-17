"use client";

import { useState } from "react";

interface ClaimRowData {
  id: number;
  venueId: number;
  venueName: string;
  venueContactEmail: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  message: string | null;
  createdAt: string;
}

export function AdminClaimRow({ claim }: { claim: ClaimRowData }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setState("idle");
    }
  }

  if (state === "done") return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">{claim.venueName}</h3>
        <span className="text-xs text-muted-2">{new Date(claim.createdAt).toLocaleDateString()}</span>
      </div>

      <p className="text-sm text-foreground/90">
        {claim.name}
        {claim.role && <span className="text-muted"> — {claim.role}</span>}
      </p>
      <p className="text-xs text-muted">
        {claim.email}
        {claim.phone && <span> · {claim.phone}</span>}
      </p>
      {claim.venueContactEmail && claim.venueContactEmail.toLowerCase() !== claim.email.toLowerCase() ? (
        <p className="text-xs text-stale">
          On-file contact for this venue is {claim.venueContactEmail} — doesn&apos;t match. Verify
          before approving.
        </p>
      ) : claim.venueContactEmail && (
        <p className="text-xs text-evergreen">Matches on-file contact email.</p>
      )}
      {claim.message && <p className="text-sm text-muted">&ldquo;{claim.message}&rdquo;</p>}

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
