import { describe, it, expect } from "vitest";
import { buildStateUpsert } from "./inbox-state";

const NOW = new Date("2026-11-22T21:00:00Z");

describe("buildStateUpsert", () => {
  it("only sets the fields that were provided", () => {
    const { set } = buildStateUpsert("v1", { starred: true }, NOW);
    expect(set).toEqual({ starred: true });
  });

  it("does not touch updatedAt for a star or status change, so a snooze's wake rule is not reset", () => {
    expect(buildStateUpsert("v1", { starred: true }, NOW).set).not.toHaveProperty("updatedAt");
    expect(buildStateUpsert("v1", { status: "done" }, NOW).set).not.toHaveProperty("updatedAt");
  });

  it("stamps updatedAt when a snooze is set or cleared", () => {
    const set1 = buildStateUpsert("v1", { snoozedUntil: "2026-11-25T17:00:00.000Z" }, NOW).set;
    expect(set1.snoozedUntil).toEqual(new Date("2026-11-25T17:00:00.000Z"));
    expect(set1.updatedAt).toEqual(NOW);
    const set2 = buildStateUpsert("v1", { snoozedUntil: null }, NOW).set;
    expect(set2.snoozedUntil).toBeNull();
    expect(set2.updatedAt).toEqual(NOW);
  });

  it("clears status with null", () => {
    expect(buildStateUpsert("v1", { status: null }, NOW).set).toEqual({ status: null });
  });

  it("builds an insert row with defaults for anything not provided", () => {
    const { values } = buildStateUpsert("u%40a.com", { status: "interested" }, NOW);
    expect(values).toEqual({
      threadKey: "u%40a.com",
      starred: false,
      snoozedUntil: null,
      status: "interested",
      updatedAt: NOW,
    });
  });

  it("returns an empty set for an empty patch", () => {
    expect(buildStateUpsert("v1", {}, NOW).set).toEqual({});
  });
});
