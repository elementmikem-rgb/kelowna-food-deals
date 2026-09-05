import { formatVerifiedRelative, isStale } from "@/lib/time";

export function VerifiedBadge({ lastVerifiedAt }: { lastVerifiedAt: Date }) {
  const stale = isStale(lastVerifiedAt);

  if (stale) {
    return (
      <span className="font-mono-tabular text-xs text-stale">
        stale — {formatVerifiedRelative(lastVerifiedAt)}
      </span>
    );
  }

  return (
    <span className="stamp px-2 py-0.5 text-[10px]">
      ✓ checked {formatVerifiedRelative(lastVerifiedAt)}
    </span>
  );
}
