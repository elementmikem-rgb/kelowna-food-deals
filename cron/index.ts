import { fetchAndExtractText } from "./fetch";
import { normalizeText, hashText } from "./hash";
import { extractVenueContent } from "./extract";
import {
  getActiveVenues,
  getLastContentHash,
  logScrapeRun,
  markVenueStillCurrent,
  replaceVenueSpecials,
  replaceVenueEvents,
} from "./upsert";

const TOKEN_CEILING = 50_000;

async function processVenue(venue: {
  id: number;
  name: string;
  website: string | null;
  menuUrl: string | null;
}): Promise<{ tokensUsed: number }> {
  const url = venue.menuUrl ?? venue.website;
  if (!url) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      error: "no website or menu_url configured",
    });
    console.error(`[${venue.name}] skipped: no website or menu_url configured`);
    return { tokensUsed: 0 };
  }

  const fetched = await fetchAndExtractText(url);
  if (!fetched.ok) {
    await logScrapeRun({
      venueId: venue.id,
      contentHash: null,
      changed: false,
      tokensUsed: 0,
      error: fetched.error,
    });
    console.error(`[${venue.name}] fetch failed: ${fetched.error}`);
    return { tokensUsed: 0 };
  }

  const normalized = normalizeText(fetched.text);
  const hash = hashText(normalized);
  const previousHash = await getLastContentHash(venue.id);

  if (previousHash === hash) {
    await markVenueStillCurrent(venue.id);
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: false,
      tokensUsed: 0,
      error: null,
    });
    console.log(`[${venue.name}] unchanged, skipped extraction`);
    return { tokensUsed: 0 };
  }

  try {
    const { specials, events, tokensUsed } = await extractVenueContent(normalized);
    await replaceVenueSpecials(venue.id, url, specials);
    await replaceVenueEvents(venue.id, url, events);
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: true,
      tokensUsed,
      error: null,
    });
    console.log(
      `[${venue.name}] changed, extracted ${specials.length} special(s) and ${events.length} event(s), ${tokensUsed} tokens`
    );
    return { tokensUsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logScrapeRun({
      venueId: venue.id,
      contentHash: hash,
      changed: true,
      tokensUsed: 0,
      error: `extraction failed: ${message}`,
    });
    console.error(`[${venue.name}] extraction failed: ${message}`);
    return { tokensUsed: 0 };
  }
}

async function main() {
  const venueList = await getActiveVenues();
  console.log(`Starting scrape run for ${venueList.length} active venue(s)`);

  let totalTokens = 0;
  let aborted = false;

  for (const venue of venueList) {
    if (totalTokens >= TOKEN_CEILING) {
      aborted = true;
      console.error(
        `Token ceiling (${TOKEN_CEILING}) reached — aborting remaining venues starting at "${venue.name}"`
      );
      break;
    }
    const { tokensUsed } = await processVenue(venue);
    totalTokens += tokensUsed;
  }

  console.log(`Run complete. Total tokens used: ${totalTokens}`);

  if (aborted) {
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("Fatal error in scrape run:", err);
    process.exit(1);
  });
