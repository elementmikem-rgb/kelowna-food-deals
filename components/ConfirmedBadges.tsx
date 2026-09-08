export function ConfirmedBadges({
  venueConfirmedAt,
  confirmCount,
}: {
  venueConfirmedAt: Date | null;
  confirmCount: number;
}) {
  if (!venueConfirmedAt && confirmCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {venueConfirmedAt && (
        <span className="stamp px-2 py-0.5 text-[10px]">✓ Confirmed by venue</span>
      )}
      {confirmCount > 0 && (
        <span className="rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[10px] text-evergreen">
          Confirmed by {confirmCount} visitor{confirmCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
