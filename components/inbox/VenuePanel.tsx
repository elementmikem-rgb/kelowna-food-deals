import type { VenuePanelData } from "@/lib/inbox-venue";
import { extractPhones, extractPrices, samePhone } from "@/lib/reply-facts";
import { suggestSpecial } from "@/lib/reply-prefill";
import { AddSpecialForm, UsePhoneButton } from "@/components/inbox/VenueApply";
import { formatMessageDate } from "@/lib/inbox-format";

// Read-only venue snapshot beside a conversation: what the listing says now, and details in the venue's
// latest reply that differ from it. Server component, no state.
export function VenuePanel({
  venue,
  venueUrl,
  replyText,
}: {
  venue: VenuePanelData;
  venueUrl: string | null;
  replyText: string | null;
}) {
  const phones = replyText ? extractPhones(replyText) : [];
  const prices = replyText ? extractPrices(replyText) : [];
  const suggestion = replyText ? suggestSpecial(replyText) : null;
  const newPhones = phones.filter((p) => !samePhone(p, venue.phone));
  const row = "flex flex-col gap-0.5";
  const label = "text-[11px] font-medium uppercase tracking-wider text-muted-2";

  return (
    <aside aria-label="Venue" className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div>
        <p className={label}>Venue</p>
        <h2 className="mt-1 font-display text-xl leading-tight text-foreground">{venue.name}</h2>
        {venue.address && <p className="mt-1 text-sm text-muted-2">{venue.address}</p>}
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {venue.claimed && <span className="rounded-md bg-evergreen/15 px-2 py-0.5 text-evergreen">Claimed</span>}
          {venue.unsubscribed && <span className="rounded-md bg-danger/10 px-2 py-0.5 text-danger">Unsubscribed</span>}
        </div>
      </div>

      {(newPhones.length > 0 || prices.length > 0) && (
        <div className="rounded-xl bg-accent-soft/30 p-3">
          <p className={label}>Spotted in their reply</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {newPhones.map((p) => (
              <li key={p} className={row}>
                <span className="text-foreground">{p}</span>
                <span className="text-xs text-muted-2">
                  {venue.phone ? `Listing has ${venue.phone}` : "No phone on the listing"}
                </span>
                <UsePhoneButton venueId={venue.id} venueName={venue.name} phone={p} current={venue.phone} />
              </li>
            ))}
            {prices.length > 0 && (
              <li className={row}>
                <span className="text-foreground">{prices.join(", ")}</span>
                <span className="text-xs text-muted-2">Price mentioned</span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className={row}>
        <p className={label}>On the listing now</p>
        {venue.specials.length === 0 ? (
          <p className="text-sm text-muted-2">No specials yet.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1.5 text-sm text-foreground">
            {venue.specials.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-2">
          {venue.eventCount} event{venue.eventCount === 1 ? "" : "s"}, {venue.photoCount} photo{venue.photoCount === 1 ? "" : "s"}
        </p>
        <div className="mt-3">
          <AddSpecialForm venueId={venue.id} venueName={venue.name} suggestion={suggestion} />
        </div>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <div className={row}>
          <dt className={label}>Phone</dt>
          <dd className="text-foreground">{venue.phone ?? "None"}</dd>
        </div>
        {venue.website && (
          <div className={row}>
            <dt className={label}>Website</dt>
            <dd className="truncate">
              <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-accent-dim underline underline-offset-2">
                {venue.website.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
        )}
        {venue.contactEmail && (
          <div className={row}>
            <dt className={label}>Email</dt>
            <dd className="truncate text-foreground">{venue.contactEmail}</dd>
          </div>
        )}
      </dl>

      {venue.sends.length > 0 && (
        <div className={row}>
          <p className={label}>Our emails</p>
          <ul className="mt-1 flex flex-col gap-1.5 text-xs text-muted">
            {venue.sends.map((s) => (
              <li key={s.at} className="flex items-center justify-between gap-2" suppressHydrationWarning>
                <span>
                  {s.kind.replace(/_/g, " ")}
                  {s.clicked ? ", clicked" : s.opened ? ", opened" : ""}
                </span>
                <span className="text-muted-2">{formatMessageDate(s.at).split(",").slice(0, 2).join(",")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {venue.note && (
        <div className={row}>
          <p className={label}>Audit note</p>
          <p className="text-xs leading-relaxed text-muted-2">{venue.note}</p>
        </div>
      )}

      {venueUrl && (
        <a
          href={venueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-accent-dim/50"
        >
          Open public listing
        </a>
      )}
    </aside>
  );
}
