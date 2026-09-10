import Link from "next/link";
import { getLastScrapeTime } from "@/lib/status";
import { formatCheckedAt } from "@/lib/time";
import { getCurrentRegion } from "@/lib/regions";

export async function SiteFooter() {
  const [lastScrape, region] = await Promise.all([getLastScrapeTime(), getCurrentRegion()]);
  const base = `/${region.slug}`;

  return (
    <footer className="flex flex-col items-center gap-1 text-center text-xs text-muted-2 pt-4 pb-8 border-t border-border">
      {lastScrape ? (
        <p>Site last checked {formatCheckedAt(lastScrape)} Pacific.</p>
      ) : (
        <p>Checking daily around 6am Pacific.</p>
      )}
      <Link href={`${base}/submit`} className="text-accent-dim underline">
        See something wrong or missing? Tell us
      </Link>
      <Link href={`${base}/blog`} className="text-muted-2 underline">
        Blog
      </Link>
      <Link href={`${base}/archive`} className="text-muted-2 underline">
        Archive
      </Link>
      <Link href={`${base}/advertise`} className="text-muted-2 underline">
        Advertise with us
      </Link>
      <Link href={`${base}#tip-jar`} className="text-muted-2 underline">
        Tip jar
      </Link>
      <Link href={`${base}/privacy`} className="text-muted-2 underline">
        Privacy &amp; terms
      </Link>
    </footer>
  );
}
