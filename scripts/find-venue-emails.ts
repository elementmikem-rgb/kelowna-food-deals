// One-off enrichment pass: for active venues with a website but no contact_email,
// fetch the site and extract an email address (mailto: link preferred, regex
// fallback over visible text). Read-only against every venue except the single
// contact_email column it writes -- never sends anything, never touches
// outreach_sends. Run with: npm run find-emails -- [--limit N] [--dry-run]
import { db, venues } from "../db";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import * as cheerio from "cheerio";
import { rateLimit } from "../cron/rateLimit";
import { isAllowedByRobots } from "../cron/fetch";

const USER_AGENT = "KelownaSpecialsBot/1.0 (+https://todaystab.com)";
const TIMEOUT_MS = 15000;

const JUNK_DOMAIN_RE =
  /(wixpress\.com|sentry\.io|godaddy\.com|example\.com|schema\.org|cloudflare\.com|google\.com|gstatic\.com|facebook\.com|w3\.org|sentry-next\.wixpress|my-domain\.com|mydomain\.com|mysite\.com|yourdomain\.com|yourcompany\.com|yourwebsite\.com|address\.com|domain\.com|website\.com|placeholder\.com|test\.com|.*\.png$|.*\.jpg$|.*\.gif$|.*\.svg$|noreply@|no-reply@)/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// A run of 4+ digits in the local part is virtually always a phone number
// that got glued onto the email because the source text had no whitespace
// between them (e.g. "284-9111info@lotus...") -- a real mailbox name is
// essentially never digit-heavy like that.
const DIGIT_RUN_RE = /\d{4,}/;

// EMAIL_RE's local-part class includes "-", so a bullet/dash separator right
// before an address with no space (e.g. "— chris.c@flyingmonkeys.ca") gets
// swept into the match as leading punctuation. Strip it before validating.
//
// Also re-extracts just the email-shaped substring rather than trusting the
// whole input verbatim -- a page with an unquoted/malformed href attribute
// (seen in the wild: `<a href=mailto:info@site.ca>i<a href="mailto:...">`)
// makes cheerio read everything up to the next tag boundary as the attribute
// value, so the raw mailto: target can carry trailing "</a></span>..." markup
// that a plain prefix-strip wouldn't remove.
function normalizeEmail(raw: string): string | null {
  const stripped = raw.replace(/^[^a-zA-Z0-9]+/, "");
  const match = stripped.match(EMAIL_RE);
  return match ? match[0] : null;
}

function isPlausibleEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (JUNK_DOMAIN_RE.test(lower)) return false;
  if (lower.length > 100) return false;
  const localPart = lower.split("@")[0];
  if (localPart.length > 40) return false;
  if (DIGIT_RUN_RE.test(localPart)) return false;
  if (localPart.startsWith("%") || localPart.includes("%20")) return false;
  return true;
}

function extractEmailFromHtml(html: string): string | null {
  const $ = cheerio.load(html);

  // Prefer an explicit mailto: link -- it's an intentional "email us" signal,
  // not just any address that happens to appear in the page text (which could
  // belong to a third-party widget, a copyright footer, etc.)
  const mailtoLinks: string[] = [];
  $("a[href^='mailto:']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const email = normalizeEmail(href.replace(/^mailto:/i, "").split("?")[0].trim());
    if (email) mailtoLinks.push(email);
  });
  const plausibleMailto = mailtoLinks.find(isPlausibleEmail);
  if (plausibleMailto) return plausibleMailto.toLowerCase();

  // Fall back to scanning visible text for an email-shaped string. Cheerio's
  // .text() concatenates text nodes with no separator, so adjacent
  // block-level elements ("284-9111" + "info@lotus...") run together into one
  // token -- insert a newline after each block element first so a real gap
  // in the page becomes a real gap in the extracted text (same fix
  // cron/fetch.ts's fetchAndExtractText already applies for the same reason).
  $("script, style, noscript, svg").remove();
  $("p, div, li, tr, td, th, br, h1, h2, h3, h4, h5, h6, section, article, header, ul, ol").after("\n");
  const text = $("body").text();
  const matches = (text.match(EMAIL_RE) ?? [])
    .map(normalizeEmail)
    .filter((e): e is string => e !== null);
  const plausibleMatch = matches.find(isPlausibleEmail);
  return plausibleMatch ? plausibleMatch.toLowerCase() : null;
}

async function fetchHtml(url: string): Promise<string | null> {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) return null;
  try {
    await rateLimit();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// A homepage often doesn't show the email itself but links to a contact page
// that does. Look for the first same-origin link whose href/text suggests
// "contact" and try that too before giving up on this venue.
function findContactPageUrl($: cheerio.CheerioAPI, baseUrl: string): string | null {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return null;
  }
  let found: string | null = null;
  $("a[href]").each((_, el) => {
    if (found) return;
    const href = $(el).attr("href") ?? "";
    const label = $(el).text().trim();
    if (!/contact/i.test(href) && !/contact/i.test(label)) return;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.origin === origin) found = resolved.toString();
    } catch {
      /* unparseable href -- skip */
    }
  });
  return found;
}

async function findEmailForVenue(website: string): Promise<string | null> {
  const homepageHtml = await fetchHtml(website);
  if (!homepageHtml) return null;

  const fromHomepage = extractEmailFromHtml(homepageHtml);
  if (fromHomepage) return fromHomepage;

  const $ = cheerio.load(homepageHtml);
  const contactUrl = findContactPageUrl($, website);
  if (!contactUrl) return null;

  const contactHtml = await fetchHtml(contactUrl);
  if (!contactHtml) return null;
  return extractEmailFromHtml(contactHtml);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

  let query = db
    .select({ id: venues.id, name: venues.name, website: venues.website })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        or(isNull(venues.contactEmail), eq(venues.contactEmail, "")),
        sql`${venues.website} is not null and ${venues.website} <> ''`
      )
    )
    // Without an explicit order, repeated --limit chunks (each call's query
    // planner is free to return rows in a different order) can keep
    // re-selecting the same still-eligible rows instead of advancing through
    // the full set -- id ordering makes each chunk a stable, disjoint slice
    // of whatever remains eligible.
    .orderBy(venues.id)
    .$dynamic();

  if (limit) query = query.limit(limit);

  const targets = await query;
  console.log(`Checking ${targets.length} venues for a website email${dryRun ? " (dry run)" : ""}...`);

  let found = 0;
  let checked = 0;
  const startedAt = Date.now();

  for (const v of targets) {
    checked++;
    if (!v.website) continue;
    let email: string | null = null;
    try {
      email = await findEmailForVenue(v.website);
    } catch (err) {
      console.warn(`[${v.id}] ${v.name}: error - ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (email) {
      found++;
      console.log(`[${v.id}] ${v.name}: found ${email}`);
      if (!dryRun) {
        await db.update(venues).set({ contactEmail: email }).where(eq(venues.id, v.id));
      }
    }

    if (checked % 50 === 0) {
      const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
      console.log(`--- progress: ${checked}/${targets.length} checked, ${found} found, ${elapsedMin}min elapsed ---`);
    }
  }

  console.log(`\nDone. Checked ${checked}, found emails for ${found}${dryRun ? " (not written, dry run)" : ""}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
