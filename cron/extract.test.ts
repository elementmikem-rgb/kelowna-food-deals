import { describe, expect, it } from "vitest";
import { arrayOrEmptyOnMistype } from "./extract";

describe("arrayOrEmptyOnMistype", () => {
  it("passes a real array through untouched", () => {
    expect(arrayOrEmptyOnMistype.parse([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it("coerces a mistyped string (seen live: model returns 'none') to an empty array", () => {
    expect(arrayOrEmptyOnMistype.parse("none")).toEqual([]);
  });

  it("coerces undefined/missing to an empty array", () => {
    expect(arrayOrEmptyOnMistype.parse(undefined)).toEqual([]);
  });

  it("coerces any other mistyped value to an empty array", () => {
    expect(arrayOrEmptyOnMistype.parse(null)).toEqual([]);
    expect(arrayOrEmptyOnMistype.parse(42)).toEqual([]);
    expect(arrayOrEmptyOnMistype.parse({})).toEqual([]);
  });
});
