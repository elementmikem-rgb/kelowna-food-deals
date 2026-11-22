import { describe, it, expect } from "vitest";
import { formatSpecialLine, dayName } from "./inbox-venue-format";

describe("dayName", () => {
  it("maps 0 to Sunday through 6 to Saturday and null to every day", () => {
    expect(dayName(0)).toBe("Sun");
    expect(dayName(6)).toBe("Sat");
    expect(dayName(null)).toBe("Daily");
  });
});

describe("formatSpecialLine", () => {
  it("shows day, price and title", () => {
    expect(formatSpecialLine({ title: "chicken wings", dayOfWeek: 6, startTime: null, endTime: null, priceCents: 100 })).toBe(
      "Sat, $1, chicken wings"
    );
  });

  it("shows a time range and whole or fractional dollars", () => {
    expect(formatSpecialLine({ title: "Pints", dayOfWeek: 2, startTime: "16:00", endTime: "18:30", priceCents: 550 })).toBe(
      "Tue 16:00 to 18:30, $5.50, Pints"
    );
  });

  it("leaves out the price when there is none", () => {
    expect(formatSpecialLine({ title: "Happy hour", dayOfWeek: null, startTime: "15:00", endTime: "17:00", priceCents: null })).toBe(
      "Daily 15:00 to 17:00, Happy hour"
    );
  });

  it("shows only a start time when there is no end time", () => {
    expect(formatSpecialLine({ title: "Trivia", dayOfWeek: 4, startTime: "19:00", endTime: null, priceCents: null })).toBe(
      "Thu from 19:00, Trivia"
    );
  });
});
