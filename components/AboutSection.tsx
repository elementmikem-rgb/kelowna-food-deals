export function AboutSection() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted flex flex-col gap-2">
      <h2 className="font-display text-lg text-foreground">About this site</h2>
      <p>
        Kelowna Daily Specials tracks food and drink deals, happy hours, wing nights, and live
        music across Kelowna, West Kelowna, Lake Country (including Winfield), and Peachland.
        Every listing is pulled directly from a venue&apos;s own website or menu, checked daily,
        and dropped the moment it can&apos;t be backed up with an explicit price, discount, or
        event date — no guessing, no scraping social media, no stale &quot;last updated 2020&quot;
        pages.
      </p>
      <p>
        See something wrong, or a place we&apos;re missing? Use the{" "}
        <a href="/submit" className="text-accent-dim underline">
          submit an update
        </a>{" "}
        page — every tip gets checked before it goes live.
      </p>
    </section>
  );
}
