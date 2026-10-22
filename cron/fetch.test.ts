import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { collectPromoFiles, isAllowedImageCdnHost, normalizeKeywordText, normalizePromoFileUrl } from "./fetch";

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
    for (const h of ["static.wixstatic.com", "ab7bfe84-c4ed-47ce-86e2-cea456407f08.filesusr.com", "images.squarespace-cdn.com", "static1.squarespace.com", "img1.wsimg.com", "cdn.prod.website-files.com", "lirp.cdn-website.com", "cdn.shopify.com"]) {
      expect(isAllowedImageCdnHost(h)).toBe(true);
    }
  });
  it("rejects everything else, including look-alikes and internal hosts", () => {
    for (const h of ["evil.com", "wixstatic.com.evil.com", "notwixstatic.com", "squarespace-cdn.com.attacker.io", "static.squarespace.com.evil.net", "localhost", "169.254.169.254", "metadata.google.internal", "shopify.com", "cdn.shopify.com.evil.com", "filesusr.com.evil.com"]) {
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
