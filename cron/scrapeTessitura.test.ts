import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({ db: {}, events: {}, venues: {}, regions: {} }));
vi.mock("./fetch", () => ({ isAllowedByRobots: vi.fn(), openBrowserSession: vi.fn() }));

import { parseCardDate, parseTessituraPage, pageLinks, TESSITURA_HALLS } from "./scrapeTessitura";

// Shape copied from the Richmond Hill Centre list (Nov 2026).
const PAGE = `
<div class="grid-search-results">
  <div class="grid-result odd"><div class="item-description"><div class="item-name">25.26 RHCPA Presents Season</div></div></div>
  <div class="grid-result even"><div class="item-description"><div class="item-name">Trooper</div>
    <div class="item-teaser"><span class="carddate">Friday, November 13, 2026 8 p.m.</span><span class="cardvenue">Main Stage</span></div></div></div>
  <div class="grid-result odd"><div class="item-description"><div class="item-name">Classic Albums Live: Billy Joel &amp; More</div>
    <div class="item-teaser"><span class="carddate">Wednesday, November 11, 2026 &amp; Thursday, November 12, 2026 8 p.m.</span></div></div></div>
</div>
<a href="default.asp?sToken=1%2Cabc&BOset::WScontent::SearchResultsInfo::current_page=2&doWork::WScontent::getPage=">2</a>
<a href="default.asp?sToken=1%2Cabc&BOset::WScontent::SearchResultsInfo::current_page=2&doWork::WScontent::getPage=">2</a>
<a href="default.asp?sToken=1%2Cabc&BOset::WScontent::SearchResultsInfo::current_page=3&doWork::WScontent::getPage=">3</a>
<a href="default.asp?sToken=1%2Cabc&BOset::WScontent::SearchResultsInfo::current_page=2&doWork::WScontent::getPage=">&raquo;</a>`;

describe("parseCardDate", () => {
  it("reads one date and the time in the several spellings the site uses", () => {
    expect(parseCardDate("Saturday, November 7, 2026 8 p.m.")).toEqual({ dates: ["2026-11-07"], time: "20:00" });
    expect(parseCardDate("Tuesday, November 17, 2026 7:00 p.m.")).toEqual({ dates: ["2026-11-17"], time: "19:00" });
    expect(parseCardDate("Saturday, November 14, 2026 8:00 PM")).toEqual({ dates: ["2026-11-14"], time: "20:00" });
    expect(parseCardDate("Sunday, November 22, 2026 3:00 p.m.")).toEqual({ dates: ["2026-11-22"], time: "15:00" });
  });
  it("reads every date on a two-night card", () => {
    expect(parseCardDate("Wednesday, November 11, 2026 & Thursday, November 12, 2026 8 p.m.")).toEqual({
      dates: ["2026-11-11", "2026-11-12"],
      time: "20:00",
    });
  });
  it("returns no dates for an empty line", () => {
    expect(parseCardDate("")).toEqual({ dates: [], time: null });
  });
});

describe("parseTessituraPage", () => {
  const list = parseTessituraPage(PAGE, TESSITURA_HALLS[0]);
  it("skips cards with no date and gives a row per night", () => {
    expect(list.map((e) => `${e.title}|${e.date}|${e.time}`)).toEqual([
      "Trooper|2026-11-13|20:00",
      "Classic Albums Live: Billy Joel & More|2026-11-11|20:00",
      "Classic Albums Live: Billy Joel & More|2026-11-12|20:00",
    ]);
  });
  it("links to the hall list on its own host", () => {
    expect(list[0].url).toBe("https://tickets.rhcentre.ca/Online/default.asp");
  });
});

describe("pageLinks", () => {
  it("returns each numbered page once, as an absolute address", () => {
    const links = pageLinks(PAGE, "https://tickets.rhcentre.ca/Online/default.asp", "rhcentre.ca");
    expect(links).toHaveLength(2);
    expect(links[0]).toMatch(/^https:\/\/tickets\.rhcentre\.ca\/Online\/default\.asp\?sToken=/);
  });
  it("drops links to other hosts and non-https links", () => {
    const html = `<a href="https://evil.example/x?current_page=2">2</a><a href="http://tickets.rhcentre.ca/a?current_page=3">3</a><a href="javascript:alert(1)//current_page=4">4</a>`;
    expect(pageLinks(html, "https://tickets.rhcentre.ca/Online/default.asp", "rhcentre.ca")).toEqual([]);
  });
});
