import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import robotsParser from "robots-parser";
import { rateLimit } from "./rateLimit";

const USER_AGENT = "KelownaSpecialsBot/1.0 (+https://kelownaspecials.com)";

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
    browser = await chromium.launch(
      executablePath
        ? {
            executablePath,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
          }
        : undefined
    );
    const page = await browser.newPage({ userAgent: USER_AGENT });
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
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
