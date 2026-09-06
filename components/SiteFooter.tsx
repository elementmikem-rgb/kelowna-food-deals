import Link from "next/link";
import { getLastScrapeTime } from "@/lib/status";
import { formatCheckedAt } from "@/lib/time";

export async function SiteFooter() {
  const lastScrape = await getLastScrapeTime();

  return (
    <footer className="flex flex-col items-center gap-1 text-center text-xs text-muted-2 pt-4 pb-8 border-t border-border">
      {lastScrape ? (
        <p>Site last checked {formatCheckedAt(lastScrape)} Pacific.</p>
      ) : (
        <p>Checking daily around 6am Pacific.</p>
      )}
      <Link href="/submit" className="text-accent-dim underline">
        See something wrong or missing? Tell us
      </Link>
      <Link href="/blog" className="text-muted-2 underline">
        Blog
      </Link>
      <Link href="/archive" className="text-muted-2 underline">
        Archive
      </Link>
      <Link href="/advertise" className="text-muted-2 underline">
        Advertise with us
      </Link>
    </footer>
  );
}
