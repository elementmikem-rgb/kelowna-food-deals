// Other locations that belong with a venue: the same chain, or the same contact email address. Shown in the
// inbox venue panel so a reply that covers several locations (one email for a whole chain) is noticed.

export interface SiblingRow {
  id: number;
  name: string;
  city: string | null;
  viaChain: boolean;
  viaEmail: boolean;
}

export interface SiblingSummary {
  total: number;
  names: string[];
  more: number;
  reason: "chain" | "address" | "both" | null;
}

const SHOWN = 6;

export function summarizeSiblings(rows: SiblingRow[], selfId: number): SiblingSummary {
  const others = rows.filter((r) => r.id !== selfId);
  if (others.length === 0) return { total: 0, names: [], more: 0, reason: null };
  const names = others.slice(0, SHOWN).map((r) => (r.city ? `${r.name} (${r.city})` : r.name));
  const anyChain = others.some((r) => r.viaChain);
  const anyEmail = others.some((r) => r.viaEmail);
  return {
    total: others.length,
    names,
    more: Math.max(0, others.length - SHOWN),
    reason: anyChain && anyEmail ? "both" : anyChain ? "chain" : "address",
  };
}

export function siblingLine(s: SiblingSummary): string | null {
  if (s.total === 0 || s.reason === null) return null;
  const what = s.total === 1 ? "other location" : "other locations";
  const why =
    s.reason === "chain"
      ? "in the same chain"
      : s.reason === "address"
        ? s.total === 1 ? "shares this email address" : "share this email address"
        : "in the same chain or sharing this email address";
  const list = s.names.join(", ") + (s.more > 0 ? ` and ${s.more} more` : "");
  return `${s.total} ${what} ${why}: ${list}`;
}
