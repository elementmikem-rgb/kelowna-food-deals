import { describe, it, expect } from "vitest";
import { normalizeAutocompleteQuery, isValidSessionToken, buildAutocompleteBody, parseAutocompleteResponse } from "./places-autocomplete";

describe("normalizeAutocompleteQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeAutocompleteQuery("  123   Main  St ")).toBe("123 Main St");
  });
  it("rejects anything under 3 characters or over 120", () => {
    expect(normalizeAutocompleteQuery("ab")).toBeNull();
    expect(normalizeAutocompleteQuery("   ")).toBeNull();
    expect(normalizeAutocompleteQuery("x".repeat(121))).toBeNull();
    expect(normalizeAutocompleteQuery(null)).toBeNull();
  });
});

describe("isValidSessionToken", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(isValidSessionToken("3f2b8c1e-5d4a-4b7e-9a10-2c6d8e0f1a2b")).toBe(true);
    expect(isValidSessionToken("not a token")).toBe(false);
    expect(isValidSessionToken("")).toBe(false);
    expect(isValidSessionToken(null)).toBe(false);
  });
});

describe("buildAutocompleteBody", () => {
  it("restricts to Canada and carries the session token", () => {
    expect(buildAutocompleteBody("123 Main", "3f2b8c1e-5d4a-4b7e-9a10-2c6d8e0f1a2b")).toEqual({
      input: "123 Main",
      sessionToken: "3f2b8c1e-5d4a-4b7e-9a10-2c6d8e0f1a2b",
      includedRegionCodes: ["ca"],
      languageCode: "en",
    });
  });
});

describe("parseAutocompleteResponse", () => {
  it("keeps place predictions, maximum 5, with a plain text label", () => {
    const json = {
      suggestions: [
        { placePrediction: { placeId: "A", text: { text: "1 Main St, Kelowna, BC, Canada" }, structuredFormat: { mainText: { text: "1 Main St" }, secondaryText: { text: "Kelowna, BC, Canada" } } } },
        { queryPrediction: { text: { text: "main street bars" } } },
        { placePrediction: { placeId: "B", text: { text: "2 Main St, Penticton, BC, Canada" } } },
        { placePrediction: { placeId: "C", text: { text: "3" } } },
        { placePrediction: { placeId: "D", text: { text: "4" } } },
        { placePrediction: { placeId: "E", text: { text: "5" } } },
        { placePrediction: { placeId: "F", text: { text: "6" } } },
      ],
    };
    const out = parseAutocompleteResponse(json);
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({ placeId: "A", text: "1 Main St, Kelowna, BC, Canada", main: "1 Main St", secondary: "Kelowna, BC, Canada" });
    expect(out[1]).toEqual({ placeId: "B", text: "2 Main St, Penticton, BC, Canada", main: "2 Main St, Penticton, BC, Canada", secondary: "" });
  });
  it("returns an empty list for anything unexpected", () => {
    expect(parseAutocompleteResponse(null)).toEqual([]);
    expect(parseAutocompleteResponse({})).toEqual([]);
    expect(parseAutocompleteResponse({ suggestions: "x" })).toEqual([]);
  });
});
