import { formatVerifiedRelative, isStale } from "@/lib/time";
import { type Language } from "@/lib/i18n";

export function VerifiedBadge({ lastVerifiedAt, lang = "en" }: { lastVerifiedAt: Date; lang?: Language }) {
  const stale = isStale(lastVerifiedAt);
  const verifiedText = formatVerifiedRelative(lastVerifiedAt, new Date(), lang);
  const prefix = lang === "fr" ? "✓ " : "✓ checked ";

  if (stale) {
    return (
      <span className="font-mono-tabular text-xs text-stale">
        stale — {verifiedText}
      </span>
    );
  }

  return (
    <span className="stamp px-2 py-0.5 text-[10px]">
      {prefix}{verifiedText}
    </span>
  );
}
