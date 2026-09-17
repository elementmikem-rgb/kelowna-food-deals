// Distinct from VerifiedBadge's dashed scrape-verified stamp -- this means a person who
// actually runs the venue is maintaining this listing, a stronger signal than "our scraper
// re-checked the site recently."
export function OwnerVerifiedBadge() {
  return (
    <span className="rounded-full border border-evergreen/40 bg-evergreen/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-evergreen">
      Owner verified
    </span>
  );
}
