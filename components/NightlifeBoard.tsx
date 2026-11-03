"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NightItem } from "@/lib/nightlife-data";
import { todayDowInRegion, dowFullName, formatTimeWindow, formatVerifiedRelative, isStale } from "@/lib/time";
import { formatPrice, formatEventDate } from "@/lib/format";
import type { Language } from "@/lib/i18n";
import { DayTabs } from "./DayTabs";

type Filter = "all" | "special" | "music" | "karaoke" | "other";

const COPY = {
  en: {
    filters: { all: "All", special: "Specials", music: "Live music", karaoke: "Karaoke", other: "DJ & shows" } as Record<Filter, string>,
    badge: { special: "Special", music: "Live music", karaoke: "Karaoke", other: "DJ & shows" } as Record<Exclude<Filter, "all">, string>,
    today: "(today)",
    count: (n: number, places: number) => `${n} thing${n === 1 ? "" : "s"} at ${places} place${places === 1 ? "" : "s"}`,
    empty: "Nothing late listed for this night yet.",
    emptyHelp: "Know a spot? Tell us and we will add it.",
    tellUs: "Tell us about a venue",
    comingUp: "Coming up",
    comingUpSub: "One-off nights in the next two weeks.",
    free: "Free",
    cover: (p: string) => `${p} cover`,
    stale: "stale",
  },
  fr: {
    filters: { all: "Tout", special: "Spéciaux", music: "Musique live", karaoke: "Karaoké", other: "DJ et spectacles" } as Record<Filter, string>,
    badge: { special: "Spécial", music: "Musique live", karaoke: "Karaoké", other: "DJ et spectacles" } as Record<Exclude<Filter, "all">, string>,
    today: "(aujourd'hui)",
    count: (n: number, places: number) => `${n} activité${n === 1 ? "" : "s"} dans ${places} endroit${places === 1 ? "" : "s"}`,
    empty: "Rien de tard n'est encore listé pour ce soir-là.",
    emptyHelp: "Vous connaissez un endroit? Dites-le-nous et nous l'ajouterons.",
    tellUs: "Proposer un lieu",
    comingUp: "À venir",
    comingUpSub: "Soirées uniques des deux prochaines semaines.",
    free: "Gratuit",
    cover: (p: string) => `${p} d'entrée`,
    stale: "périmé",
  },
};

// Minutes used to order a night: anything before 4am belongs to the end of the night, so a
// 12:30am set sorts after an 11pm one. No start time sorts last.
function sortKey(time: string | null): number {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + (m || 0);
  return mins < 4 * 60 ? mins + 24 * 60 : mins;
}

function Row({ item, regionSlug, lang }: { item: NightItem; regionSlug: string; lang: Language }) {
  const c = COPY[lang];
  const time = formatTimeWindow(item.startTime, item.endTime, lang);
  const price = formatPrice(item.priceCents);
  const cover =
    item.coverChargeCents === null ? null : item.coverChargeCents === 0 ? c.free : c.cover(formatPrice(item.coverChargeCents) ?? "");
  const stale = isStale(item.lastVerifiedAt);
  const venue = item.venueId ? (
    <Link href={`/${regionSlug}/venues/${item.venueId}`} className="font-medium text-foreground hover:underline">
      {item.venueName}
    </Link>
  ) : (
    <span className="font-medium text-foreground">{item.venueName}</span>
  );
  return (
    <li className={`flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 ${stale ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {venue}
          <span className="shrink-0 rounded-full border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
            {c.badge[item.kind]}
          </span>
        </div>
        <p className="text-sm text-foreground/90">{item.title}</p>
        {item.description && <p className="text-xs text-muted">{item.description}</p>}
        <p className="text-[11px] text-muted-2">
          {item.venueCity ? `${item.venueCity} · ` : ""}
          {stale ? `${c.stale} -- ` : ""}
          {formatVerifiedRelative(item.lastVerifiedAt, new Date(), lang)}
        </p>
      </div>
      <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
        {item.specificDate && <span className="font-mono-tabular text-xs text-accent-dim">{formatEventDate(item.specificDate, lang)}</span>}
        {time && <span className="font-mono-tabular text-sm text-foreground">{time}</span>}
        {price && <span className="font-mono-tabular text-[11px] text-muted">{price}</span>}
        {cover && <span className="font-mono-tabular text-[11px] text-muted">{cover}</span>}
      </div>
    </li>
  );
}

export function NightlifeBoard({
  weekly,
  upcoming,
  timezone,
  regionSlug,
  lang = "en",
}: {
  weekly: NightItem[];
  upcoming: NightItem[];
  timezone: string;
  regionSlug: string;
  lang?: Language;
}) {
  const c = COPY[lang];
  const today = useMemo(() => todayDowInRegion(timezone), [timezone]);
  const [day, setDay] = useState(today);
  const [filter, setFilter] = useState<Filter>("all");

  const matches = (i: NightItem) => filter === "all" || i.kind === filter;

  const dayItems = useMemo(
    () =>
      weekly
        .filter((i) => (i.dayOfWeek === null || i.dayOfWeek === day) && matches(i))
        .sort((a, b) => sortKey(a.startTime) - sortKey(b.startTime) || a.venueName.localeCompare(b.venueName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekly, day, filter]
  );
  const upcomingItems = useMemo(
    () => upcoming.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upcoming, filter]
  );
  const places = new Set(dayItems.map((i) => i.venueId ?? i.venueName)).size;
  const present = new Set<string>([...weekly, ...upcoming].map((i) => i.kind));
  const filters = (Object.keys(c.filters) as Filter[]).filter((f) => f === "all" || present.has(f));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <DayTabs selected={day} today={today} onSelect={setDay} lang={lang} />

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-selected={filter === f}
              className={`press-pill hit-44 rounded-full px-3.5 py-1.5 text-sm border ${
                filter === f ? "bg-accent text-background border-accent" : "bg-transparent text-muted border-border hover:border-muted"
              }`}
            >
              {c.filters[f]}
            </button>
          ))}
        </div>

        <p className="text-sm text-muted">
          {dowFullName(day, lang)}
          {day === today ? ` ${c.today}` : ""} · {c.count(dayItems.length, places)}
        </p>

        {dayItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-2">
            <p>{c.empty}</p>
            <p className="mt-1">
              {c.emptyHelp}{" "}
              <Link href={`/${regionSlug}/submit`} className="text-accent-dim underline">
                {c.tellUs}
              </Link>
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {dayItems.map((i) => (
              <Row key={i.key} item={i} regionSlug={regionSlug} lang={lang} />
            ))}
          </ul>
        )}
      </div>

      {upcomingItems.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-2xl text-foreground">{c.comingUp}</h2>
            <p className="text-sm text-muted">{c.comingUpSub}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {upcomingItems.map((i) => (
              <Row key={i.key} item={i} regionSlug={regionSlug} lang={lang} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
