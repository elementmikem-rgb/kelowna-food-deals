// One-off maintenance script: forces a fresh extraction for every active venue
// regardless of whether the source page content changed since last scrape.
//
// Why this exists: the day-range extraction prompt was fixed (Mon-Fri happy
// hours no longer collapse to day_of_week=null, which the day-filter UI reads
// as "runs every day"). The normal daily cron skips re-extraction when a
// venue's page content hash is unchanged, so venues whose source page hasn't
// changed since their last scrape would keep the old, wrong data indefinitely.
// This bypasses that hash gate once to apply the corrected prompt everywhere.
import { fetchAndExtractText, fetchAndExtractTextViaBrowser } from "../cron/fetch";
import { normalizeText, hashText } from "../cron/hash";
import { extractVenueContent } from "../cron/extract";
import { getActiveVenues, logScrapeRun, replaceVenueSpecials, replaceVenueEvents } from "../cron/upsert";
import { db, regions } from "../db";
import { eq } from "drizzle-orm";

const TOKEN_CEILING = 200_000;

async function main() {
  // Loops over every active region, same as cron/index.ts's runScrapeCycle,
  // since getActiveVenues is now region-scoped.
  const activeRegions = await db.select().from(regions).where(eq(regions.active, true));

  let ok = 0;
  let failed = 0;
  let grandTotalTokens = 0;

  for (const region of activeRegions) {
    const venueList = await getActiveVenues(region.id);
    console.log(`Force re-extracting ${venueList.length} active venue(s) in region ${region.slug}`);

    let totalTokens = 0;

    for (const venue of venueList) {
      if (totalTokens >= TOKEN_CEILING) {
        console.error(`Token ceiling (${TOKEN_CEILING}) reached — stopping at "${venue.name}"`);
        break;
      }

      const url = venue.menuUrl ?? venue.website;
      if (!url) {
        console.error(`[${venue.name}] skipped: no website or menu_url configured`);
        failed++;
        continue;
      }

      const fetched = venue.requiresBrowser
        ? await fetchAndExtractTextViaBrowser(url)
        : await fetchAndExtractText(url);
      if (!fetched.ok) {
        console.error(`[${venue.name}] fetch failed: ${fetched.error}`);
        await logScrapeRun({ venueId: venue.id, contentHash: null, changed: false, tokensUsed: 0, error: fetched.error });
        failed++;
        continue;
      }

      const normalized = normalizeText(fetched.text);
      const hash = hashText(normalized);

      try {
        const { specials, events, tokensUsed } = await extractVenueContent(normalized);
        await replaceVenueSpecials(venue.id, region.id, url, specials);
        await replaceVenueEvents(venue.id, region.id, url, events);
        await logScrapeRun({ venueId: venue.id, contentHash: hash, changed: true, tokensUsed, error: null });
        totalTokens += tokensUsed;
        ok++;
        console.log(
          `[${venue.name}] re-extracted ${specials.length} special(s) and ${events.length} event(s), ${tokensUsed} tokens`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${venue.name}] extraction failed: ${message}`);
        await logScrapeRun({ venueId: venue.id, contentHash: hash, changed: true, tokensUsed: 0, error: `extraction failed: ${message}` });
        failed++;
      }
    }

    grandTotalTokens += totalTokens;
  }

  console.log(`Done. ${ok} succeeded, ${failed} failed, ${grandTotalTokens} tokens used.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
