import { formatVerifiedRelative, isStale } from "@/lib/time";

export function VerifiedBadge({ lastVerifiedAt }: { lastVerifiedAt: Date }) {
  const stale = isStale(lastVerifiedAt);
  return (
    <span
      className={`font-mono-tabular text-xs ${stale ? "text-stale" : "text-muted"}`}
    >
      {stale ? "stale — " : ""}
      {formatVerifiedRelative(lastVerifiedAt)}
    </span>
  );
}
