import Link from "next/link";
import { getLastScrapeTime } from "@/lib/status";
import { formatCheckedAt } from "@/lib/time";
import { getCurrentRegion } from "@/lib/regions";
import { t, getEffectiveLanguage } from "@/lib/i18n";
import { getVerifyLink } from "@/lib/guide-links";

export async function SiteFooter() {
  const [lastScrape, region] = await Promise.all([getLastScrapeTime(), getCurrentRegion()]);
  const lang = await getEffectiveLanguage(region);
  const footer = t(lang).footer;
  const verify = getVerifyLink(region.slug, lang);
  const base = `/${region.slug}`;

  return (
    <footer className="flex flex-col items-center gap-1 text-center text-xs text-muted-2 pt-4 pb-8 border-t border-border">
      {lastScrape ? (
        <p>Site last checked {formatCheckedAt(lastScrape)} Pacific.</p>
      ) : (
        <p>Checking daily around 6am Pacific.</p>
      )}
      <Link href={`${base}/submit`} className="text-accent-dim underline">
        {footer.tellUs}
      </Link>
      <Link href={`${base}/blog`} className="text-muted-2 underline">
        {footer.blog}
      </Link>
      {verify && (
        <Link href={verify.href} className="text-muted-2 underline">
          {verify.title}
        </Link>
      )}
      <Link href={`${base}/archive`} className="text-muted-2 underline">
        {footer.archive}
      </Link>
      <Link href={`${base}/advertise`} className="text-muted-2 underline">
        {footer.advertise}
      </Link>
      <Link href={`${base}#tip-jar`} className="text-muted-2 underline">
        {footer.tipJar}
      </Link>
      <Link href={`${base}/privacy`} className="text-muted-2 underline">
        {footer.privacy}
      </Link>
      <a
        href="https://www.google.com/preferences/source?q=todaystab.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-2 underline"
      >
        {footer.preferredSource}
      </a>
      <Link href="/owner/login" className="text-muted-2 underline">
        {footer.ownerLogin}
      </Link>
    </footer>
  );
}
