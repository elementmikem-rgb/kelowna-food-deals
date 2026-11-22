import { describe, it, expect } from "vitest";
import { describeDrift } from "./region-drift";

describe("describeDrift", () => {
  it("says everything is in sync when there is no drift", () => {
    const d = describeDrift({ specials: 0, events: 0, venues: 0 });
    expect(d.inSync).toBe(true);
    expect(d.summary).toMatch(/in sync/i);
  });

  it("describes drift with counts and the number of venues", () => {
    const d = describeDrift({ specials: 12, events: 3, venues: 2 });
    expect(d.inSync).toBe(false);
    expect(d.summary).toContain("12 specials");
    expect(d.summary).toContain("3 events");
    expect(d.summary).toContain("2 venues");
  });

  it("uses singular wording for exactly one", () => {
    const d = describeDrift({ specials: 1, events: 0, venues: 1 });
    expect(d.summary).toContain("1 special");
    expect(d.summary).not.toContain("1 specials");
    expect(d.summary).toContain("1 venue");
    expect(d.summary).not.toContain("1 venues");
  });

  it("leaves out a kind that has none", () => {
    const d = describeDrift({ specials: 0, events: 4, venues: 1 });
    expect(d.summary).not.toMatch(/special/i);
    expect(d.summary).toContain("4 events");
  });
});
