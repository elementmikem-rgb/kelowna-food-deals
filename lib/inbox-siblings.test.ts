import { describe, it, expect } from "vitest";
import { summarizeSiblings, siblingLine, type SiblingRow } from "./inbox-siblings";

const row = (id: number, name: string, o: Partial<SiblingRow> = {}): SiblingRow => ({
  id,
  name,
  city: null,
  viaChain: true,
  viaEmail: false,
  ...o,
});

describe("summarizeSiblings", () => {
  it("is empty when there are no other locations", () => {
    expect(summarizeSiblings([], 1)).toEqual({ total: 0, names: [], more: 0, reason: null });
  });

  it("never lists the venue itself", () => {
    const out = summarizeSiblings([row(1, "Self"), row(2, "Other")], 1);
    expect(out.total).toBe(1);
    expect(out.names).toEqual(["Other"]);
  });

  it("adds the city to tell same-name locations apart", () => {
    const out = summarizeSiblings([row(2, "Pampa", { city: "Calgary" }), row(3, "Pampa", { city: "Red Deer" })], 1);
    expect(out.names).toEqual(["Pampa (Calgary)", "Pampa (Red Deer)"]);
  });

  it("lists at most 6 names and says how many more", () => {
    const rows = Array.from({ length: 9 }, (_, i) => row(i + 2, `V${i + 2}`));
    const out = summarizeSiblings(rows, 1);
    expect(out.total).toBe(9);
    expect(out.names).toHaveLength(6);
    expect(out.more).toBe(3);
  });

  it("says why they are linked: chain, shared address, or both", () => {
    expect(summarizeSiblings([row(2, "A", { viaChain: true, viaEmail: false })], 1).reason).toBe("chain");
    expect(summarizeSiblings([row(2, "A", { viaChain: false, viaEmail: true })], 1).reason).toBe("address");
    expect(summarizeSiblings([row(2, "A", { viaChain: true, viaEmail: false }), row(3, "B", { viaChain: false, viaEmail: true })], 1).reason).toBe("both");
  });
});

describe("siblingLine", () => {
  it("is null when there are none", () => {
    expect(siblingLine({ total: 0, names: [], more: 0, reason: null })).toBeNull();
  });
  it("reads naturally for one location and for several", () => {
    expect(siblingLine({ total: 1, names: ["Pampa (Calgary)"], more: 0, reason: "chain" })).toBe(
      "1 other location in the same chain: Pampa (Calgary)"
    );
    expect(siblingLine({ total: 3, names: ["A", "B", "C"], more: 0, reason: "address" })).toBe(
      "3 other locations share this email address: A, B, C"
    );
    expect(siblingLine({ total: 8, names: ["A", "B", "C", "D", "E", "F"], more: 2, reason: "both" })).toBe(
      "8 other locations in the same chain or sharing this email address: A, B, C, D, E, F and 2 more"
    );
  });
});
