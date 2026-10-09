// A real private club (yacht/golf/country club dining room) that requires membership
// to dine -- distinct from a golf-course restaurant open to the public. Warns a
// visitor before they plan a trip expecting to walk in. See venues.membersOnly's own
// schema comment for why this is set manually, never inferred from the venue's name.
export function MembersOnlyBadge() {
  return (
    <span className="rounded-full border border-stale/40 bg-stale/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stale">
      Members only
    </span>
  );
}
