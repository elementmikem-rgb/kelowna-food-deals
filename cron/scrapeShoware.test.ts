import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({ db: {}, events: {}, venues: {}, regions: {} }));
vi.mock("./fetch", () => ({ isAllowedByRobots: vi.fn() }));
vi.mock("./rateLimit", () => ({ rateLimit: vi.fn() }));

import { parseShowareDateTime, parseShowarePerformances, SHOWARE_HALLS } from "./scrapeShoware";

describe("parseShowareDateTime", () => {
  it("reads the date and the time", () => {
    expect(parseShowareDateTime("Friday, November 6, 2026 8:00:00 PM")).toEqual({ date: "2026-11-06", time: "20:00" });
    expect(parseShowareDateTime("Sunday, November 15, 2026 3:00:00 PM")).toEqual({ date: "2026-11-15", time: "15:00" });
    expect(parseShowareDateTime("Saturday, December 5, 2026 12:30:00 AM")).toEqual({ date: "2026-12-05", time: "00:30" });
    expect(parseShowareDateTime("Saturday, December 5, 2026 12:00:00 PM")).toEqual({ date: "2026-12-05", time: "12:00" });
  });
  it("keeps a date with no time and rejects other text", () => {
    expect(parseShowareDateTime("Friday, November 6, 2026")).toEqual({ date: "2026-11-06", time: null });
    expect(parseShowareDateTime("soon")).toBeNull();
  });
});

describe("parseShowarePerformances", () => {
  const hall = SHOWARE_HALLS[0];
  const rows = [
    { EventID: 1248, Event: "FLOYDIUM 2026", PerformanceName: "Floydium", PerformanceDateTime: "Saturday, November 7, 2026 8:00:00 PM" },
    { EventID: 9, Event: "BAD", PerformanceName: "Bad", PerformanceDateTime: "" },
    { Event: "Plain &amp; Simple", PerformanceDateTime: "Sunday, November 8, 2026 7:00:00 PM" },
  ];
  const list = parseShowarePerformances(rows, hall);
  it("keeps rows with a date and a title", () => expect(list).toHaveLength(2));
  it("uses the performance name, decodes entities and links to the event page on its own host", () => {
    expect(list[0]).toEqual({ title: "Floydium", date: "2026-11-07", time: "20:00", url: "https://tickets.regenttheatre.ca/eventperformances.asp?evt=1248" });
    expect(list[1].title).toBe("Plain & Simple");
    expect(list[1].url).toBeNull();
  });
});
