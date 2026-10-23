import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { collectPromoFiles, isAllowedImageCdnHost, isPromoPage, normalizeKeywordText, normalizePromoFileUrl } from "./fetch";

const PAGE = "https://venue.example.com/menu";

describe("normalizeKeywordText", () => {
  it("turns filename separators into spaces so keywords match", () => {
    expect(normalizeKeywordText("CT+HAPPY+HOUR+TENT+WEB.png")).toMatch(/happy hour/i);
    expect(normalizeKeywordText("Specials_October-2024.jpg")).toMatch(/specials october/i);
  });
  it("decodes percent-encoding and survives malformed input", () => {
    expect(normalizeKeywordText("Wings%20Table%20Talker.pdf")).toMatch(/wings table talker/i);
    expect(() => normalizeKeywordText("%E0%A4%A")).not.toThrow();
  });
});

describe("isAllowedImageCdnHost", () => {
  it("allows the listed site-builder image hosts", () => {
    for (const h of ["static.wixstatic.com", "ab7bfe84-c4ed-47ce-86e2-cea456407f08.filesusr.com", "images.squarespace-cdn.com", "static1.squarespace.com", "img1.wsimg.com", "cdn.prod.website-files.com", "lirp.cdn-website.com", "cdn.shopify.com", "tratto-assets.s3.us-west-1.amazonaws.com", "bucket.s3.amazonaws.com", "s3.us-west-2.amazonaws.com"]) {
      expect(isAllowedImageCdnHost(h)).toBe(true);
    }
  });
  it("rejects everything else, including look-alikes and internal hosts", () => {
    for (const h of ["evil.com", "wixstatic.com.evil.com", "notwixstatic.com", "squarespace-cdn.com.attacker.io", "static.squarespace.com.evil.net", "localhost", "169.254.169.254", "metadata.google.internal", "shopify.com", "cdn.shopify.com.evil.com", "filesusr.com.evil.com", "s3.amazonaws.com.evil.com", "evil.com.s3.amazonaws.com.evil.io", "notamazonaws.com", "amazonaws.com"]) {
      expect(isAllowedImageCdnHost(h)).toBe(false);
    }
  });
});

describe("normalizePromoFileUrl", () => {
  it("resolves relative URLs and drops query and hash", () => {
    expect(normalizePromoFileUrl("/s/website-dinner.png?format=1500w#x", PAGE)).toBe("https://venue.example.com/s/website-dinner.png");
  });
  it("swaps a Wix thumbnail rendition for the original upload", () => {
    expect(normalizePromoFileUrl("https://static.wixstatic.com/media/52bdd3_abc~mv2.jpg/v1/fill/w_191,h_420,al_c/Specials%20October%202024.jpg", PAGE)).toBe("https://static.wixstatic.com/media/52bdd3_abc~mv2.jpg");
  });
  it("returns null for unparseable input", () => {
    expect(normalizePromoFileUrl("http://", PAGE)).toBeNull();
  });
});

describe("collectPromoFiles", () => {
  it("finds plain <a> links to menu images (Squarespace-style buttons)", () => {
    const $ = cheerio.load(`<a href="/s/website-dinner.png">Dinner</a><a href="/s/website-cocktail-menu.png">Drinks</a><a href="/s/logo.png">Home</a>`);
    const { images, pdfs } = collectPromoFiles($, PAGE);
    expect(images).toEqual(["https://venue.example.com/s/website-dinner.png", "https://venue.example.com/s/website-cocktail-menu.png"]);
    expect(pdfs).toEqual([]);
  });

  it("prefers the PDF over the thumbnail wrapped inside its link (Wix-style flyers)", () => {
    const $ = cheerio.load(
      `<a href="/_files/ugd/abc.pdf"><img alt="Wings Table Talker April 2026.jpg" src="https://static.wixstatic.com/media/x~mv2.jpg/v1/fill/w_200,h_200/x.jpg"></a>`
    );
    const { images, pdfs } = collectPromoFiles($, PAGE);
    expect(pdfs).toEqual(["https://venue.example.com/_files/ugd/abc.pdf"]);
    expect(images).toEqual([]);
  });

  it("matches keywords in alt text and in filenames with + separators", () => {
    const $ = cheerio.load(`<img src="/img/CT+HAPPY+HOUR+WEB.png"><img src="/img/team-photo.jpg" alt="Our team"><img src="/img/a.jpg" alt="Specials October 2024.jpg">`);
    const { images } = collectPromoFiles($, PAGE);
    expect(images).toEqual(["https://venue.example.com/img/CT+HAPPY+HOUR+WEB.png", "https://venue.example.com/img/a.jpg"]);
  });

  it("ignores non-file links and files with no promo keyword", () => {
    const $ = cheerio.load(`<a href="/menu">Menu</a><a href="/img/building.jpg">Photo</a><a href="/files/annual-report.pdf">Report</a>`);
    expect(collectPromoFiles($, PAGE)).toEqual({ images: [], pdfs: [] });
  });

  it("ranks specials and happy hour files ahead of regular menus before applying the cap", () => {
    const menus = ["lunch", "dinner", "kids", "dessert"].map((n) => `<a href="/files/${n}-menu.pdf">${n} menu</a>`).join("");
    const happy = `<a href="/files/Happy-Hour-2026.pdf">Hoppy Hour Menu PDF</a>`;
    const { pdfs } = collectPromoFiles(cheerio.load(menus + happy), PAGE);
    expect(pdfs).toHaveLength(3);
    expect(pdfs[0]).toBe("https://venue.example.com/files/Happy-Hour-2026.pdf");
  });

  it("dedupes and caps the number of files per page", () => {
    const links = Array.from({ length: 10 }, (_, i) => `<a href="/s/menu-${i}.png">Menu ${i}</a>`).join("") + `<a href="/s/menu-0.png">Menu again</a>`;
    const pdfLinks = Array.from({ length: 6 }, (_, i) => `<a href="/s/drinks-${i}.pdf">Drinks ${i}</a>`).join("");
    const { images, pdfs } = collectPromoFiles(cheerio.load(links + pdfLinks), PAGE);
    expect(images).toHaveLength(4);
    expect(new Set(images).size).toBe(4);
    expect(pdfs).toHaveLength(3);
  });
});

describe("isPromoPage", () => {
  it("recognises a specials / happy hour page by URL, title or h1", () => {
    expect(isPromoPage(cheerio.load("<html></html>"), "https://v.example.com/specials/")).toBe(true);
    expect(isPromoPage(cheerio.load("<html></html>"), "https://v.example.com/happy-hour-1")).toBe(true);
    expect(isPromoPage(cheerio.load("<title>Weekly Specials | Tide</title>"), "https://v.example.com/page")).toBe(true);
    expect(isPromoPage(cheerio.load("<h1>Daily Deals</h1>"), "https://v.example.com/x")).toBe(true);
  });
  it("does not treat an ordinary page as a specials page", () => {
    expect(isPromoPage(cheerio.load("<title>Home | Pub</title><h1>Welcome</h1>"), "https://v.example.com/")).toBe(false);
  });
});

describe("collectPromoFiles on a specials page", () => {
  const SPECIALS = "https://venue.example.com/specials/";
  it("takes content images with random filenames", () => {
    const $ = cheerio.load(`<body><main><img src="/wp-content/uploads/2026/09/ECFA84EA-D000-4939-AB40-EE9E65605A65.png" alt=""><img src="https://bucket.s3.us-west-1.amazonaws.com/2026-10-04-poster-web.png"></main></body>`);
    const { images } = collectPromoFiles($, SPECIALS);
    expect(images).toEqual([
      "https://venue.example.com/wp-content/uploads/2026/09/ECFA84EA-D000-4939-AB40-EE9E65605A65.png",
      "https://bucket.s3.us-west-1.amazonaws.com/2026-10-04-poster-web.png",
    ]);
  });
  it("skips logos, header/footer images, tiny images and delivery buttons", () => {
    const $ = cheerio.load(`<header><img src="/a/hero.png"></header><body><img src="/a/Schooners_nautical-logo_NEW-1.png"><img src="/a/tiny.png" width="64" height="64"><img src="/a/skipthedishes-button.png"><img src="/a/menu-poster.png" width="1024" height="1536"></body><footer><img src="/a/foot.png"></footer>`);
    const { images } = collectPromoFiles($, SPECIALS);
    expect(images).toEqual(["https://venue.example.com/a/menu-poster.png"]);
  });
  it("reads a lazy-loaded image from data-src when src is a placeholder", () => {
    const $ = cheerio.load(`<body><img src="data:image/gif;base64,R0lGOD" data-src="/a/week-1.png"></body>`);
    expect(collectPromoFiles($, SPECIALS).images).toEqual(["https://venue.example.com/a/week-1.png"]);
  });
  it("ranks random-filename specials images ahead of keyword-only menu images", () => {
    const $ = cheerio.load(`<body><img src="/a/kids-menu.png"><img src="/a/0123456789.png"></body>`);
    expect(collectPromoFiles($, SPECIALS).images[0]).toBe("https://venue.example.com/a/0123456789.png");
  });
});

describe("collectPromoFiles chrome images", () => {
  it("skips delivery-app buttons and logos even when their filename has a menu or food keyword", () => {
    const $ = cheerio.load(`<body><img src="/u/kisspng-skipthedishes-restaurant-delivery-menu-take-out-food-dish.png"><img src="/u/order-food-online-button.png"><img src="/u/daily-specials.png"></body>`);
    expect(collectPromoFiles($, "https://venue.example.com/").images).toEqual(["https://venue.example.com/u/daily-specials.png"]);
  });
});

describe("collectPromoFiles on an ordinary page", () => {
  it("still ignores random-filename images", () => {
    const $ = cheerio.load(`<title>Home</title><body><img src="/a/ECFA84EA-D000.png"><img src="/a/team-photo.jpg"></body>`);
    expect(collectPromoFiles($, "https://venue.example.com/").images).toEqual([]);
  });
});
