import { describe, it, expect } from "vitest";
import { formatPercent, formatHours, languageLabel } from "./reply-analytics-format";

describe("formatPercent", () => {
  it("shows a whole percent, or a dash when there is nothing to measure", () => {
    expect(formatPercent(0.5)).toBe("50%");
    expect(formatPercent(0.0724)).toBe("7%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(null)).toBe("-");
  });
});

describe("formatHours", () => {
  it("uses minutes, hours or days so the number is easy to read", () => {
    expect(formatHours(null)).toBe("-");
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(13)).toBe("13 h");
    expect(formatHours(2.25)).toBe("2.3 h");
    expect(formatHours(48)).toBe("2 days");
    expect(formatHours(60)).toBe("2.5 days");
  });
});

describe("languageLabel", () => {
  it("names the languages", () => {
    expect(languageLabel("en")).toBe("English");
    expect(languageLabel("fr")).toBe("French");
    expect(languageLabel("xx")).toBe("xx");
  });
});
