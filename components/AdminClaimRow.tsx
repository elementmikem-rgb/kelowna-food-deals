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
  chainSuggestion: { chainName: string; otherClaimedVenues: string[] } | null;
  ownerMatch: { id: number; name: string; venues: string[] } | null;
}

interface OwnerSearchResult {
  id: number;
  name: string;
  email: string;
}

function LinkOwnerSearch({
  onSelect,
  onCancel,
}: {
  onSelect: (owner: OwnerSearchResult) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OwnerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/admin/venue-owners/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(res.ok ? data.results : []);
    setSearching(false);
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-2 flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search owners by name or email..."
          className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
        />
        <button
          onClick={onCancel}
          className="press-pill rounded-full border border-border px-2.5 py-1 text-xs text-muted"
        >
          Cancel
        </button>
      </div>
      {searching && <p className="text-xs text-muted-2">Searching…</p>}
      {results.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className="text-left text-xs rounded-lg px-2.5 py-1.5 hover:bg-surface"
        >
          <span className="font-medium text-foreground/90">{r.name}</span>{" "}
          <span className="text-muted">{r.email}</span>
        </button>
      ))}
    </div>
  );
}

export function AdminClaimRow({ claim }: { claim: ClaimRowData }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [linkedOwner, setLinkedOwner] = useState<OwnerSearchResult | null>(null);
  const [showLinkSearch, setShowLinkSearch] = useState(false);

  async function act(action: "approve" | "reject") {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "approve" && linkedOwner ? { linkToOwnerId: linkedOwner.id } : {}),
        }),
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

      {/* Suggestions only -- informational, never gate or auto-approve. Approving still
          creates a brand-new owner unless the admin explicitly picks "Link" below. */}
      {claim.chainSuggestion && (
        <p className="text-xs text-gold">
          Part of the {claim.chainSuggestion.chainName} chain — already claimed:{" "}
          {claim.chainSuggestion.otherClaimedVenues.join(", ")}.
        </p>
      )}
      {claim.ownerMatch && !linkedOwner && (
        <p className="text-xs text-gold">
          Email/phone matches existing owner <strong>{claim.ownerMatch.name}</strong> (owns:{" "}
          {claim.ownerMatch.venues.join(", ")}) — approving will automatically link this venue to
          that account instead of creating a new one.
        </p>
      )}

      {linkedOwner && (
        <p className="text-xs text-evergreen">
          Will link to existing owner <strong>{linkedOwner.name}</strong> ({linkedOwner.email}) instead of
          creating a new account.{" "}
          <button onClick={() => setLinkedOwner(null)} className="underline">
            Undo
          </button>
        </p>
      )}

      {showLinkSearch && !linkedOwner && (
        <LinkOwnerSearch
          onSelect={(owner) => {
            setLinkedOwner(owner);
            setShowLinkSearch(false);
          }}
          onCancel={() => setShowLinkSearch(false)}
        />
      )}

      {error && <p className="text-xs text-stale">{error}</p>}

      <div className="flex gap-2 mt-1 items-center">
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
        {!linkedOwner && !showLinkSearch && (
          <button
            onClick={() => setShowLinkSearch(true)}
            disabled={state === "loading"}
            className="text-xs text-muted underline disabled:opacity-50"
          >
            Link to existing owner…
          </button>
        )}
      </div>
    </div>
  );
}
