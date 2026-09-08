import type { SpecialWithVenue } from "@/lib/data";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { formatTimeWindow, formatVerifiedRelative, isStale } from "@/lib/time";
import { isPromotionActive } from "@/lib/promotion";

// Confirm/Report used to live on every row here -- up to MAX_VISIBLE (5) pairs
// stacked in one venue card, which is both visually noisy and a real
// accidental-tap risk on mobile. Both actions now live once per venue card
// (see SpecialVenueGroup), applying to that venue's freshest special. This
// component is a pure display row again, matching the shape SpecialCard.tsx
// still needs (SpecialCard renders one venue's specials on its own dedicated
// page, where per-special actions still make sense -- no crowding there).
export function SpecialRow({ special }: { special: SpecialWithVenue }) {
  const stale = isStale(special.lastVerifiedAt);
  const price = formatPrice(special.priceCents);
  const timeWindow = formatTimeWindow(special.startTime, special.endTime);
  const boosted = isPromotionActive(special.boostedUntil);

  return (
    <li className={`relative z-10 py-2.5 first:pt-0 last:pb-0 ${stale ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground/90">{special.title}</p>
            <span className="shrink-0 rounded-full border border-evergreen/30 bg-evergreen/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-evergreen">
              {CATEGORY_LABELS[special.category]}
            </span>
            {boosted && (
              <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                Featured
              </span>
            )}
          </div>
          {special.description && (
            <p className="text-xs text-muted">{special.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
          {price && <span className="font-mono-tabular text-sm text-accent">{price}</span>}
          {timeWindow && (
            <span className="font-mono-tabular text-[11px] text-muted">{timeWindow}</span>
          )}
        </div>
      </div>

      {stale && (
        <p className="mt-1 text-[11px] text-stale">
          stale — {formatVerifiedRelative(special.lastVerifiedAt)}
        </p>
      )}
    </li>
  );
}
