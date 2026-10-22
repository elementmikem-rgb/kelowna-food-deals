import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import robotsParser from "robots-parser";
import { lookup as dnsLookup } from "dns/promises";
import { isIP } from "net";
import { rateLimit } from "./rateLimit";
import { transcribeImageText } from "./vision";

// kelownaspecials.com is NXDOMAIN — a venue operator checking their access
// logs needs an identifier that actually resolves.
const USER_AGENT = "KelownaSpecialsBot/1.0 (+https://kelownafooddeals.shop)";

// SSRF guard for image URLs pulled out of a venue's OWN page content --
// unlike venue.website/menuUrl (typed in by Mike when seeding a venue),
// an <img src> is third-party input: any venue site (compromised, or just
// misconfigured) could point one at an internal service or a cloud metadata
// endpoint, and this server would fetch it. Same-origin-only narrows this a
// lot (a real promo image is basically always hosted on the venue's own
// domain), and the IP-range check below stops the DNS-rebinding case where
// that same domain resolves to something internal anyway.
function isPrivateOrReservedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const octets = ip.split(".").map(Number);
    const [a, b] = octets;
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    return (
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("::ffff:127.") ||
      lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:169.254.")
    );
  }
  return false;
}

// Site builders serve every uploaded flyer/menu image from their own CDN hostname, never the
// venue's domain (Wix -> static.wixstatic.com, Squarespace -> images.squarespace-cdn.com and, after
// a redirect, static1.squarespace.com ...), so the same-hostname rule below silently skipped
// exactly the files venues upload. These well-known public hosts are listed explicitly (not "any
// host") so the SSRF guard keeps its teeth: https only, every URL must still resolve to a public
// IP, and at most one redirect is followed (see fetchPromoFile) and only to a host that passes
// this same check. Approved by Mike 2026-10-22.
const IMAGE_CDN_HOST_RES: RegExp[] = [
  /(^|\.)wixstatic\.com$/i,
  /(^|\.)filesusr\.com$/i, // Wix user-uploaded documents (PDFs), where /_files/ links redirect
  /(^|\.)squarespace-cdn\.com$/i,
  /^static\d*\.squarespace\.com$/i,
  /(^|\.)wsimg\.com$/i, // GoDaddy Website Builder
  /(^|\.)editmysite\.com$/i, // Square Online / Weebly
  /(^|\.)cdn-website\.com$/i, // Duda
  /(^|\.)website-files\.com$/i, // Webflow
  /^cdn\.shopify\.com$/i,
];

export function isAllowedImageCdnHost(hostname: string): boolean {
  return IMAGE_CDN_HOST_RES.some((re) => re.test(hostname));
}

async function isSafeImageUrl(imgUrl: string, pageUrl: string): Promise<boolean> {
  let url: URL;
  let page: URL;
  try {
    url = new URL(imgUrl);
    page = new URL(pageUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.hostname !== page.hostname && url.protocol !== "https:") return false;
  if (url.hostname !== page.hostname && !isAllowedImageCdnHost(url.hostname)) return false;
  try {
    const addresses = await dnsLookup(url.hostname, { all: true });
    if (addresses.some((a) => isPrivateOrReservedIp(a.address))) return false;
  } catch {
    return false; // unresolvable host -- don't fetch it
  }
  return true;
}

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
  | { ok: true; text: string; tokensUsed: number }
  | { ok: false; error: string };

// Same ceiling vision.ts enforces post-download -- checked here first, off
// the Content-Length header, so a venue with a genuinely huge promo image
// doesn't cost a full download (and rate-limit slot) for a call that would
// just get rejected afterward anyway.
const MAX_IMAGE_DOWNLOAD_BYTES = 5 * 1024 * 1024;

function exceedsMaxImageSize(res: Response): boolean {
  const len = res.headers.get("content-length");
  return len !== null && Number(len) > MAX_IMAGE_DOWNLOAD_BYTES;
}

// A venue's own promo graphic/flyer only ever shows up as an <img> tag or a link to an image/PDF
// file -- cheerio's .text() pass has nothing to extract from either, so that content was invisible
// to the pipeline until image transcription existed (see ./vision.ts). Mirrors discover.ts's
// KEYWORD_RE but kept as its own copy here rather than imported: discover.ts already imports from
// this file, and importing back from discover.ts would create a cycle.
const PROMO_FILE_KEYWORD_RE =
  /special|happy ?hour|promo|deal|menu|drink|dinner|lunch|brunch|brekk|breakfast|cocktail|feature|wing|beer|wine|flyer|talker|daily|food/i;
const STRONG_PROMO_RE = /special|happy ?hour|hoppy|deal|promo|daily|feature|wing|talker|flyer/i;
const MAX_IMAGES_PER_PAGE = 4;
const MAX_PDFS_PER_PAGE = 3;
const MAX_PDF_TEXT_CHARS = 8000;
const MIN_PDF_TEXT_CHARS = 40; // an image-only (scanned) PDF has no text layer; nothing to read

// Filenames and alt text use +, _, - and . as word separators ("CT+HAPPY+HOUR+WEB.png"), which
//  / \s patterns never match, so normalize before testing keywords.
export function normalizeKeywordText(s: string): string {
  let d = s;
  try {
    d = decodeURIComponent(s);
  } catch {
    /* keep raw */
  }
  return d.replace(/[+_\-.]+/g, " ");
}

// Resolves a file URL, drops query/hash, and keys the transcription cache on the file itself.
export function normalizePromoFileUrl(raw: string, pageUrl: string): string | null {
  try {
    const u = new URL(raw, pageUrl);
    u.hash = "";
    u.search = "";
    let out = u.toString();
    // Wix serves resized renditions ("/media/abc~mv2.jpg/v1/fill/w_191,h_420/x.jpg") that are
    // thumbnails too small to read; the part before "/v1/" is the original upload.
    if (/wixstatic\.com$/i.test(u.hostname)) {
      const i = out.indexOf("/v1/");
      if (i > 0) out = out.slice(0, i);
    }
    return out;
  } catch {
    return null;
  }
}

function fileKind(url: string): "pdf" | "image" | null {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  if (/\.pdf$/i.test(path)) return "pdf";
  if (/\.(png|jpe?g|webp|gif)$/i.test(path)) return "image";
  return null;
}

// Pure (no network) so it's unit-testable: which image/PDF files on this page look like a
// menu/specials/happy-hour graphic? Covers <img> tags AND plain <a href="...png|pdf"> links
// (Squarespace menu buttons, Wix flyers wrapped in a link to a PDF).
export function collectPromoFiles(
  $: cheerio.CheerioAPI,
  pageUrl: string
): { images: string[]; pdfs: string[] } {
  const images: string[] = [];
  const pdfs: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string, hint: string) => {
    const abs = normalizePromoFileUrl(raw, pageUrl);
    if (!abs || seen.has(abs)) return;
    const kind = fileKind(abs);
    if (!kind) return;
    if (!PROMO_FILE_KEYWORD_RE.test(normalizeKeywordText(`${hint} ${abs.split("/").pop()}`))) return;
    seen.add(abs);
    (kind === "pdf" ? pdfs : images).push(abs);
  };

  // Links first: a flyer image wrapped in a link to its PDF is better read from the PDF text
  // than from the thumbnail inside it.
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const inner = $(el).find("img").first();
    add(href, `${$(el).text()} ${inner.attr("alt") ?? ""}`);
  });
  $("img[src]").each((_, el) => {
    const wrapped = $(el).closest("a[href]").attr("href");
    if (wrapped && fileKind(normalizePromoFileUrl(wrapped, pageUrl) ?? "") === "pdf") return;
    add($(el).attr("src") ?? "", $(el).attr("alt") ?? "");
  });
  // The per-page caps exist to bound cost, so spend them on the files most likely to hold
  // deals: a venue with a lunch menu, dinner menu, kids menu AND a happy hour PDF must not have
  // the happy hour one cut off just because it appears last in the page.
  const rank = (u: string) => (STRONG_PROMO_RE.test(normalizeKeywordText(u.split("/").pop() ?? "")) ? 0 : 1);
  const byRank = (a: string, b: string) => rank(a) - rank(b); // Array.sort is stable
  return { images: images.sort(byRank).slice(0, MAX_IMAGES_PER_PAGE), pdfs: pdfs.sort(byRank).slice(0, MAX_PDFS_PER_PAGE) };
}

// Fetches a promo file without ever following a redirect blindly: a 3xx is followed AT MOST ONCE,
// and only if the target passes isSafeImageUrl (same host as the page, or a listed site-builder
// CDN, https, public IP). Squarespace's "/s/menu.png" links, for example, 302 to static1.squarespace.com.
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function fetchPromoFile(fileUrl: string, pageUrl: string): Promise<Response | null> {
  await rateLimit();
  let res = await fetch(fileUrl, { headers: { "User-Agent": USER_AGENT }, redirect: "manual" });
  if (REDIRECT_STATUSES.has(res.status)) {
    const loc = res.headers.get("location");
    let target: string;
    try {
      target = new URL(loc ?? "", fileUrl).toString();
    } catch {
      return null;
    }
    if (!(await isSafeImageUrl(target, pageUrl))) {
      console.warn(`[${fileUrl}] redirect target not allowed, skipped`);
      return null;
    }
    await rateLimit();
    res = await fetch(target, { headers: { "User-Agent": USER_AGENT }, redirect: "manual" });
  }
  return res.ok ? res : null;
}

async function readPromoPdf(pdfUrl: string, pageUrl: string): Promise<string> {
  if (!(await isSafeImageUrl(pdfUrl, pageUrl))) {
    console.warn(`[${pdfUrl}] skipped promo PDF: not a same-origin or listed site-builder public URL`);
    return "";
  }
  const res = await fetchPromoFile(pdfUrl, pageUrl);
  if (!res) return "";
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf") && !/\.pdf$/i.test(new URL(pdfUrl).pathname)) return "";
  if (exceedsMaxImageSize(res)) {
    console.warn(`[${pdfUrl}] skipped promo PDF: exceeds ${MAX_IMAGE_DOWNLOAD_BYTES} byte limit`);
    return "";
  }
  const parser = new PDFParse({ data: Buffer.from(await res.arrayBuffer()) });
  try {
    const text = (await parser.getText()).text.trim();
    return text.length >= MIN_PDF_TEXT_CHARS ? text.slice(0, MAX_PDF_TEXT_CHARS) : "";
  } finally {
    await parser.destroy();
  }
}

async function transcribePromoImages(
  $: cheerio.CheerioAPI,
  pageUrl: string
): Promise<{ text: string; tokensUsed: number }> {
  const { images, pdfs } = collectPromoFiles($, pageUrl);

  let combinedText = "";
  let tokensUsed = 0;

  for (const pdfUrl of pdfs) {
    try {
      const text = await readPromoPdf(pdfUrl, pageUrl);
      if (text) combinedText += `
=== PDF: ${pdfUrl} ===
${text}
`;
    } catch {
      // One bad PDF (dead link, corrupt file) shouldn't fail the whole page.
    }
  }

  for (const imgUrl of images) {
    if (!(await isSafeImageUrl(imgUrl, pageUrl))) {
      console.warn(`[${imgUrl}] skipped promo image transcription: not a same-origin or listed site-builder public URL`);
      continue;
    }
    try {
      // fetchPromoFile never follows a redirect blindly (see its comment): the target must pass
      // the same host/IP checks as the original URL.
      const res = await fetchPromoFile(imgUrl, pageUrl);
      if (!res) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;
      if (exceedsMaxImageSize(res)) {
        console.warn(`[${imgUrl}] skipped promo image transcription: exceeds ${MAX_IMAGE_DOWNLOAD_BYTES} byte limit`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const result = await transcribeImageText(buffer, contentType, imgUrl);
      if (!result) continue;
      tokensUsed += result.tokensUsed;
      if (result.text) {
        combinedText += `
=== IMAGE: ${imgUrl} ===
${result.text}
`;
      }
    } catch {
      // One bad image (dead link, corrupt file) shouldn't fail the whole page.
    }
  }
  return { text: combinedText, tokensUsed };
}

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
      return { ok: true, text: parsed.text, tokensUsed: 0 };
    }

    // A venue whose menuUrl/sourceUrls points directly at an image file
    // (not a page that happens to contain one) -- transcribe it directly
    // instead of falling through to cheerio, which would just turn the raw
    // image bytes into garbage text.
    if (contentType.startsWith("image/")) {
      if (exceedsMaxImageSize(res)) {
        return { ok: false, error: `image exceeds ${MAX_IMAGE_DOWNLOAD_BYTES} byte limit` };
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const result = await transcribeImageText(buffer, contentType, url);
      if (!result) {
        return { ok: false, error: "image transcription failed" };
      }
      return { ok: true, text: result.text, tokensUsed: result.tokensUsed };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const { text: imageText, tokensUsed } = await transcribePromoImages($, url);
    $("script, style, noscript, svg, nav, footer").remove();
    // cheerio's .text() concatenates text nodes with no separator, so
    // adjacent block elements run together ("DRINKS" + "HOUSE BEER" becomes
    // "drinkshouse beer") and evidence-quote verification then fails against
    // real prices. Insert a newline after each block-level element first.
    $("p, div, li, tr, td, th, br, h1, h2, h3, h4, h5, h6, section, article, header, ul, ol").after(
      "\n"
    );
    const text = $("body").text();
    return { ok: true, text: text + imageText, tokensUsed };
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
    // document.body can genuinely be null here -- seen live on matchpub.com: a page that
    // does a client-side redirect/reload sometime in that 2500ms window can have the old
    // document torn down and the new one not yet attached at the exact moment evaluate()
    // runs. A short poll (not a single reread) covers that transitional gap instead of
    // hard-failing the whole fetch over what's usually a few hundred ms of bad timing.
    const text = await page.evaluate(async () => {
      for (let attempt = 0; attempt < 5 && !document.body; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (!document.body) return null;
      document.querySelectorAll("script, style, noscript, svg, nav, footer").forEach((el) => el.remove());
      return document.body.innerText;
    });
    if (text === null) {
      return { ok: false, error: "document.body never attached after redirect/reload" };
    }
    return { ok: true, text, tokensUsed: 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await browser?.close().catch(() => {});
  }
}

// Same browser-launch path as fetchAndExtractTextViaBrowser, but returns the
// rendered page's raw HTML instead of extracted text -- for a scraper that
// needs real markup (links, structured label/value pairs) to parse with
// cheerio, not a flattened text blob. Used for sites that 403 a plain
// server-side fetch (bot-protection keyed on browser fingerprint/TLS) but
// load fine for a real browser.
export async function fetchHtmlViaBrowser(
  url: string
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const session = await openBrowserSession();
  try {
    return await session.fetchHtml(url);
  } finally {
    await session.close();
  }
}

export interface BrowserSession {
  fetchHtml(url: string): Promise<{ ok: true; html: string } | { ok: false; error: string }>;
  close(): Promise<void>;
}

// One browser + one persistent context reused across many sequential
// requests to the SAME site, instead of a fresh browser per page. A site
// behind Cloudflare's bot-check clears its JS challenge once and sets a
// clearance cookie for the session -- a brand-new browser (no cookies, no
// history) on every single request looks exactly like the repeated-anonymous-
// visitor pattern that challenge exists to catch, so a scraper making many
// requests to one site in a short window (e.g. one listing page plus a dozen
// event detail pages) needs this, not fetchHtmlViaBrowser's one-shot version.
export async function openBrowserSession(): Promise<BrowserSession> {
  const { chromium } = await import("playwright-core");
  const executablePath = resolveChromiumPath();
  const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-http2"];
  const browser = await chromium.launch(executablePath ? { executablePath, args: launchArgs } : { args: launchArgs });
  const context = await browser.newContext({ userAgent: USER_AGENT });

  return {
    async fetchHtml(url: string) {
      const allowed = await isAllowedByRobots(url);
      if (!allowed) {
        return { ok: false, error: "disallowed by robots.txt" };
      }
      try {
        await rateLimit();
        const page = await context.newPage();
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
          // A Cloudflare/bot-check interstitial ("Just a moment...") clears
          // itself client-side a few seconds after load; a plain fixed wait
          // isn't enough to tell "real page" from "still on the challenge",
          // so wait specifically for the interstitial's own title to change
          // instead of guessing a duration long enough for every case.
          if ((await page.title()) === "Just a moment...") {
            await page.waitForFunction(() => document.title !== "Just a moment...", { timeout: 8000 }).catch(() => {});
          } else {
            await page.waitForTimeout(1500);
          }
          const html = await page.content();
          return { ok: true, html } as const;
        } finally {
          await page.close().catch(() => {});
        }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    async close() {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}
