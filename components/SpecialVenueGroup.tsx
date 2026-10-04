import Link from "next/link";
import type { SpecialWithVenue } from "@/lib/data";
import { SpecialRow } from "./SpecialRow";
import { VerifiedBadge } from "./VerifiedBadge";
import { OwnerVerifiedBadge } from "./OwnerVerifiedBadge";
import { ConfirmedBadges } from "./ConfirmedBadges";
import { VenueGroupActions } from "./VenueGroupActions";
import { SaveVenueButton } from "./SaveVenueButton";
import { isPromotionActive } from "@/lib/promotion";
import { t, type Language } from "@/lib/i18n";

// Above this many, a venue's card starts crowding out everyone else's on the
// board (BNA Brewing and Cutwater Brewing both run past 10) -- the rest are
// one click away on the venue's own page, which lists all of them anyway.
const MAX_VISIBLE = 5;

export function SpecialVenueGroup({
  venueId,
  venueName,
  specials,
  regionSlug,
  lang = "en",
}: {
  venueId: number;
  venueName: string;
  specials: SpecialWithVenue[];
  regionSlug: string;
  lang?: Language;
}) {
  const freshest = specials.reduce((latest, s) =>
    s.lastVerifiedAt > latest.lastVerifiedAt ? s : latest
  );
  const featured = isPromotionActive(specials[0]?.venueFeaturedUntil ?? null);
  const isPartner = specials[0]?.venuePartnerSince != null;
  const photoId = specials[0]?.venuePhotoId ?? null;
  const visible = specials.slice(0, MAX_VISIBLE);
  const hiddenCount = specials.length - visible.length;

  return (
    <article
      className={`pin-card ${
        venueId % 2 === 0 ? "tilt-a" : "tilt-b"
      } break-inside-avoid-column mb-3 rounded-2xl border ${
        featured ? "border-gold" : "border-border"
      } bg-surface overflow-hidden flex flex-col gap-1 shadow-[0_2px_10px_rgba(42,40,24,0.06)]`}
    >
      <Link
        href={`/${regionSlug}/venues/${venueId}`}
        className="absolute inset-0 z-0"
        aria-label={t(lang).card.fullDetails(venueName)}
      />

      {/* Lead photo when a visitor has submitted one for this venue -- most
          venues don't have one yet (submission-driven, see lib/data.ts's
          venuePhotoId comment), so the card layout below works fine without
          this block too. Sized and treated like a pinned photo: tall enough
          to carry the card, with the venue name set directly on it (dark
          scrim for contrast) and the VERIFIED stamp pinned to its corner
          like a label clipped to a photo, not a plain content thumbnail. */}
      {photoId !== null && (
        <div className="relative z-0 h-44 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/venue-photos/${photoId}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
          <div className="absolute top-2 right-2 pointer-events-none">
            <div className="rounded-full bg-surface/95 px-0.5 py-0.5 shadow-sm">
              <VerifiedBadge lastVerifiedAt={freshest.lastVerifiedAt} lang={lang} />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="font-display text-xl leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] break-words">
                {venueName}
              </h3>
              {featured && (
                <span className="shrink-0 rounded-full border border-gold/60 bg-gold/20 backdrop-blur-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                  {t(lang).card.featured}
                </span>
              )}
              {isPartner && (
                <span className="shrink-0 rounded-full border border-evergreen/60 bg-evergreen/20 backdrop-blur-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
                  {t(lang).card.partner}
                </span>
              )}
            </div>
            {freshest.venueClaimedAt !== null && (
              <div className="shrink-0">
                <OwnerVerifiedBadge />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 pt-5 flex flex-col gap-1">
      {photoId === null ? (
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-x-3 gap-y-1 pointer-events-none pb-2 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="font-display text-xl leading-tight text-foreground break-words">{venueName}</h3>
            {featured && (
              <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                {t(lang).card.featured}
              </span>
            )}
            {isPartner && (
              <span className="shrink-0 rounded-full border border-evergreen/40 bg-evergreen/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-evergreen">
                {t(lang).card.partner}
              </span>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            {specials.length > 1 && (
              <span className="text-[11px] text-muted-2 uppercase tracking-wide">
                {specials.length} specials
              </span>
            )}
            {freshest.venueClaimedAt !== null && <OwnerVerifiedBadge />}
            <VerifiedBadge lastVerifiedAt={freshest.lastVerifiedAt} lang={lang} />
            <SaveVenueButton
              venueId={venueId}
              venueName={venueName}
              regionSlug={regionSlug}
              lang={lang}
              className="pointer-events-auto"
            />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex items-center justify-end gap-2 pointer-events-none pb-2 border-b border-border">
          {specials.length > 1 && (
            <span className="text-[11px] text-muted-2 uppercase tracking-wide">
              {specials.length} specials
            </span>
          )}
          <SaveVenueButton
            venueId={venueId}
            venueName={venueName}
            regionSlug={regionSlug}
            lang={lang}
            className="pointer-events-auto"
          />
        </div>
      )}

      <ul className="flex flex-col divide-y divide-border">
        {visible.map((s) => (
          <SpecialRow key={s.id} special={s} lang={lang} />
        ))}
      </ul>

      {hiddenCount > 0 && (
        <p className="relative z-10 pointer-events-none mt-1 pt-2 border-t border-dashed border-border text-xs font-medium text-accent-dim">
          + {hiddenCount} more -- view all {specials.length} specials →
        </p>
      )}

      <div className="relative z-10 flex items-center justify-between gap-3 mt-1 pt-2 border-t border-border">
        <ConfirmedBadges
          venueConfirmedAt={freshest.venueConfirmedAt}
          confirmCount={freshest.confirmCount}
          lastConfirmedAt={freshest.lastConfirmedAt}
          lang={lang}
        />
        <VenueGroupActions specialId={freshest.id} venueId={venueId} lang={lang} />
      </div>
      </div>
    </article>
  );
}
