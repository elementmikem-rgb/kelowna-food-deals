import { describe, expect, it } from "vitest";
import { pacificDayRange, pacificMidnight } from "./pacific-time";

describe("pacificMidnight", () => {
  it("is 08:00 UTC in winter (PST) and 07:00 UTC in summer (PDT)", () => {
    expect(pacificMidnight("2026-11-07").toISOString()).toBe("2026-11-07T08:00:00.000Z");
    expect(pacificMidnight("2026-07-15").toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("follows the clock change days", () => {
    // Spring forward is Mar 8 2026 at 2 AM, so midnight that day is still PST.
    expect(pacificMidnight("2026-03-08").toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(pacificMidnight("2026-03-09").toISOString()).toBe("2026-03-09T07:00:00.000Z");
    // Fall back is Nov 1 2026 at 2 AM, so midnight that day is still PDT.
    expect(pacificMidnight("2026-11-01").toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(pacificMidnight("2026-11-02").toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });
});

describe("pacificDayRange", () => {
  it("covers whole Pacific days, with the end day included", () => {
    const { from, to } = pacificDayRange("2026-11-07", "2026-11-07");
    expect(from.toISOString()).toBe("2026-11-07T08:00:00.000Z");
    expect(to.toISOString()).toBe("2026-11-08T08:00:00.000Z");
  });

  it("spans several days", () => {
    const { from, to } = pacificDayRange("2026-11-05", "2026-11-07");
    expect(from.toISOString()).toBe("2026-11-05T08:00:00.000Z");
    expect(to.toISOString()).toBe("2026-11-08T08:00:00.000Z");
  });

  it("rolls over a month end", () => {
    const { to } = pacificDayRange("2026-10-30", "2026-10-31");
    expect(to.toISOString()).toBe("2026-11-01T07:00:00.000Z");
  });
});
