import { isRecentConfirm, formatRecentRelative } from "@/lib/time";
import type { Language } from "@/lib/i18n";

export function ConfirmedBadges({
  venueConfirmedAt,
  confirmCount,
  lastConfirmedAt = null,
  lang = "en",
}: {
  venueConfirmedAt: Date | null;
  confirmCount: number;
  // Optional -- callers before this badge existed (if any survive) still work with
  // no live badge, since it's the least essential of the three signals.
  lastConfirmedAt?: Date | null;
  lang?: Language;
}) {
  if (!venueConfirmedAt && confirmCount === 0) return null;

  // A very recent confirm reads as "someone was just there" (see isRecentConfirm's
  // window) -- stronger and more specific than the static "by N visitors" count, so
  // it replaces that badge rather than showing both at once.
  const live = lastConfirmedAt && isRecentConfirm(lastConfirmedAt);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {venueConfirmedAt && (
        <span className="rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[10px] text-evergreen">
          ✓ Confirmed by venue
        </span>
      )}
      {live ? (
        <span className="flex items-center gap-1 rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[10px] text-evergreen">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-evergreen" />
          Confirmed {formatRecentRelative(lastConfirmedAt, undefined, lang)}
        </span>
      ) : (
        confirmCount > 0 && (
          <span className="rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[10px] text-evergreen">
            Confirmed by {confirmCount} visitor{confirmCount === 1 ? "" : "s"}
          </span>
        )
      )}
    </div>
  );
}
