import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import robotsParser from "robots-parser";
import { rateLimit } from "./rateLimit";

// kelownaspecials.com is NXDOMAIN — a venue operator checking their access
// logs needs an identifier that actually resolves.
const USER_AGENT = "KelownaSpecialsBot/1.0 (+https://kelownafooddeals.shop)";

const robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>();

async function getRobots(origin: string) {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  try {
    await rateLimit();
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      robotsCache.set(origin, null);
      return null;
    }
    const body = await res.text();
    const robots = robotsParser(`${origin}/robots.txt`, body);
    robotsCache.set(origin, robots);
    return robots;
  } catch {
    robotsCache.set(origin, null);
    return null;
  }
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const origin = new URL(url).origin;
    const robots = await getRobots(origin);
    if (!robots) return true; // no robots.txt or unreachable -> treat as allowed
    return robots.isAllowed(url, USER_AGENT) ?? true;
  } catch {
    return true;
  }
}

export type FetchResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function fetchAndExtractText(url: string): Promise<FetchResult> {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) {
    return { ok: false, error: "disallowed by robots.txt" };
  }

  try {
    await rateLimit();
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      return { ok: true, text: parsed.text };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg, nav, footer").remove();
    // cheerio's .text() concatenates text nodes with no separator, so
    // adjacent block elements run together ("DRINKS" + "HOUSE BEER" becomes
    // "drinkshouse beer") and evidence-quote verification then fails against
    // real prices. Insert a newline after each block-level element first.
    $("p, div, li, tr, td, th, br, h1, h2, h3, h4, h5, h6, section, article, header, ul, ol").after(
      "\n"
    );
    const text = $("body").text();
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Some venue sites load their specials/events content via client-side JS
// (widgets, calendar boxes) that a plain fetch never sees — the page has no
// text there at all until a real browser runs its scripts. Used only for
// venues explicitly flagged venues.requiresBrowser, set once an admin
// confirms a venue needs it (checking every venue with a browser every night
// would be needlessly slow/heavy for the ~1 in 60 that actually need it).
//
// Alpine ships no Playwright browser builds — playwright-core drives
// Alpine's own `chromium` package via an explicit executablePath instead.
// Same pattern already proven in Photaro's utils/leadSiteScraper.js.
function resolveChromiumPath(): string | undefined {
  const fs = require("fs") as typeof import("fs");
  const candidates = [process.env.CHROMIUM_PATH, "/usr/bin/chromium-browser", "/usr/bin/chromium"].filter(
    (p): p is string => !!p
  );
  return candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
}

export async function fetchAndExtractTextViaBrowser(url: string): Promise<FetchResult> {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) {
    return { ok: false, error: "disallowed by robots.txt" };
  }

  let browser: import("playwright-core").Browser | undefined;
  try {
    await rateLimit();
    const { chromium } = await import("playwright-core");
    const executablePath = resolveChromiumPath();
    // --disable-http2 works around net::ERR_HTTP2_PROTOCOL_ERROR seen on some
    // sites (e.g. montanas.ca) specifically with Playwright-launched Chromium
    // -- a real interactive Chrome browser loads the same page fine, so this
    // looks like an ALPN/H2-negotiation quirk tied to Playwright's launch
    // flags rather than anything wrong with the target site.
    const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-http2"];
    browser = await chromium.launch(executablePath ? { executablePath, args: launchArgs } : { args: launchArgs });
    const page = await browser.newPage({ userAgent: USER_AGENT });
    // "load" instead of "networkidle": a page with any persistent connection
    // (a chat widget, an analytics beacon) never reaches "networkidle" and
    // times out even though the real content finished rendering ages ago
    // (seen on montanas.ca). A short fixed wait after "load" covers the
    // common case of content injected shortly after the load event.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => {
      document.querySelectorAll("script, style, noscript, svg, nav, footer").forEach((el) => el.remove());
      return document.body.innerText;
    });
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await browser?.close().catch(() => {});
  }
}
