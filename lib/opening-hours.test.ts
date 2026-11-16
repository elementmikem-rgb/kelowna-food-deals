import { describe, it, expect } from "vitest";
import { parseOpeningHours, formatTime12, hoursRows, openingHoursJsonLd, type OpeningHours } from "./opening-hours";

const MISS_PATS: OpeningHours = {
  "0": [["09:00", "16:35"]],
  "1": null,
  "2": [["09:00", "18:35"]],
  "3": [["09:00", "16:35"]],
  "4": [["09:00", "18:35"]],
  "5": [["09:00", "19:35"]],
  "6": [["08:30", "19:35"]],
};

describe("parseOpeningHours", () => {
  it("accepts a full week", () => {
    expect(parseOpeningHours(MISS_PATS)).toEqual(MISS_PATS);
  });

  it("returns null for null, junk and non-objects", () => {
    expect(parseOpeningHours(null)).toBeNull();
    expect(parseOpeningHours("9-5")).toBeNull();
    expect(parseOpeningHours(42)).toBeNull();
    expect(parseOpeningHours([])).toBeNull();
  });

  it("rejects a week with a missing day", () => {
    const { "3": _drop, ...rest } = MISS_PATS;
    expect(parseOpeningHours(rest)).toBeNull();
  });

  it("rejects a malformed time", () => {
    expect(parseOpeningHours({ ...MISS_PATS, "2": [["9am", "6pm"]] })).toBeNull();
    expect(parseOpeningHours({ ...MISS_PATS, "2": [["25:00", "18:00"]] })).toBeNull();
    expect(parseOpeningHours({ ...MISS_PATS, "2": [["09:00", "18:60"]] })).toBeNull();
  });

  it("rejects a week where every day is closed", () => {
    const allClosed = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), null]));
    expect(parseOpeningHours(allClosed)).toBeNull();
  });

  it("accepts split shifts and an after-midnight close", () => {
    const h = { ...MISS_PATS, "5": [["11:00", "14:00"], ["17:00", "02:00"]] };
    expect(parseOpeningHours(h)).toEqual(h);
  });
});

describe("formatTime12", () => {
  it("formats times the way people read them", () => {
    expect(formatTime12("09:00")).toBe("9 am");
    expect(formatTime12("16:35")).toBe("4:35 pm");
    expect(formatTime12("12:00")).toBe("12 pm");
    expect(formatTime12("00:00")).toBe("12 am");
    expect(formatTime12("23:05")).toBe("11:05 pm");
    expect(formatTime12("12:30")).toBe("12:30 pm");
  });
});

describe("hoursRows", () => {
  it("lists Monday to Sunday with Closed for closed days", () => {
    const rows = hoursRows(MISS_PATS);
    expect(rows.map((r) => r.day)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(rows[0].text).toBe("Closed");
    expect(rows[1].text).toBe("9 am to 6:35 pm");
    expect(rows[5].text).toBe("8:30 am to 7:35 pm");
    expect(rows[6].text).toBe("9 am to 4:35 pm");
  });

  it("joins split shifts with a comma", () => {
    const rows = hoursRows({ ...MISS_PATS, "5": [["11:00", "14:00"], ["17:00", "22:00"]] });
    expect(rows[4].text).toBe("11 am to 2 pm, 5 pm to 10 pm");
  });

  it("flags the row for the given weekday number (0 = Sunday)", () => {
    const rows = hoursRows(MISS_PATS, 2);
    expect(rows.filter((r) => r.isToday).map((r) => r.day)).toEqual(["Tuesday"]);
    expect(hoursRows(MISS_PATS).some((r) => r.isToday)).toBe(false);
  });
});

describe("openingHoursJsonLd", () => {
  it("emits one spec per open range and none for closed days", () => {
    const spec = openingHoursJsonLd(MISS_PATS);
    expect(spec).toHaveLength(6);
    expect(spec).toContainEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Tuesday",
      opens: "09:00",
      closes: "18:35",
    });
    expect(spec.some((s) => s.dayOfWeek === "https://schema.org/Monday")).toBe(false);
  });

  it("emits a spec per shift", () => {
    const spec = openingHoursJsonLd({ ...MISS_PATS, "5": [["11:00", "14:00"], ["17:00", "02:00"]] });
    expect(spec.filter((s) => s.dayOfWeek === "https://schema.org/Friday")).toHaveLength(2);
  });
});
