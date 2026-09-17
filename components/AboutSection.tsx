import { t, type Language } from "@/lib/i18n";

export function AboutSection({
  brandName,
  areas,
  regionSlug,
  lang = "en",
}: {
  brandName: string;
  areas: string[];
  regionSlug: string;
  lang?: Language;
}) {
  const about = t(lang).about;
  const areaList =
    areas.length === 0
      ? ""
      : areas.length === 1
        ? areas[0]
        : `${areas.slice(0, -1).join(", ")}, and ${areas[areas.length - 1]}`;
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted flex flex-col gap-2">
      <h2 className="font-display text-lg text-foreground">{about.heading}</h2>
      <p>
        {brandName} tracks food and drink deals, happy hours, wing nights, and live music
        {areaList && ` across ${areaList}`}. Every listing is pulled directly from a
        venue&apos;s own website or menu, checked daily, and dropped the moment it can&apos;t be
        backed up with an explicit price, discount, or event date — no guessing, no scraping
        social media, no stale &quot;last updated 2020&quot; pages.
      </p>
      <p>
        {about.seeWrong}{" "}
        <a href={`/${regionSlug}/submit`} className="text-accent-dim underline">
          {about.submitLink}
        </a>{" "}
        {about.submitTrailer}
      </p>
    </section>
  );
}
