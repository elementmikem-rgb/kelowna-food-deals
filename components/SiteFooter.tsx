import { getLastScrapeTime } from "@/lib/status";
import { formatCheckedAt } from "@/lib/time";

export async function SiteFooter() {
  const lastScrape = await getLastScrapeTime();

  return (
    <footer className="text-center text-xs text-muted-2 pt-4 pb-8 border-t border-border">
      {lastScrape ? (
        <p>Site last checked {formatCheckedAt(lastScrape)} Pacific — runs automatically every day.</p>
      ) : (
        <p>Site checks for updates automatically every day at 6am Pacific.</p>
      )}
    </footer>
  );
}
