import { describe, it, expect } from "vitest";
import { verifyExtraction } from "./extract";

const PAGE = "Welcome to the pub. Hours: Mon closed, Tue-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-8pm. Wings $12 every Tuesday.";
const HAY = PAGE.toLowerCase();

const GOOD_HOURS = {
  evidence_quote: "Mon closed, Tue-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-8pm",
  days: [
    { days_of_week: [1], open: null, close: null },
    { days_of_week: [2, 3, 4], open: "11:00", close: "22:00" },
    { days_of_week: [5, 6], open: "11:00", close: "23:00" },
    { days_of_week: [0], open: "12:00", close: "20:00" },
  ],
};

const base = { specials: [], events: [], menu_items: [] };

describe("verifyExtraction opening hours", () => {
  it("returns verified hours when the quote is in the page text", () => {
    const r = verifyExtraction({ ...base, opening_hours: GOOD_HOURS }, HAY);
    expect(r.openingHours?.["1"]).toBeNull();
    expect(r.openingHours?.["2"]).toEqual([["11:00", "22:00"]]);
    expect(r.openingHours?.["0"]).toEqual([["12:00", "20:00"]]);
  });

  it("drops hours whose quote is not in the page text, keeping everything else", () => {
    const r = verifyExtraction({ ...base, opening_hours: { ...GOOD_HOURS, evidence_quote: "Open every day from nine until late at night" } }, HAY);
    expect(r.openingHours).toBeNull();
    expect(r.specials).toEqual([]);
  });

  it("drops hours with a quote too short to prove anything", () => {
    const r = verifyExtraction({ ...base, opening_hours: { ...GOOD_HOURS, evidence_quote: "11am" } }, HAY);
    expect(r.openingHours).toBeNull();
  });

  it("drops hours whose quote has no digits", () => {
    const r = verifyExtraction({ ...base, opening_hours: { ...GOOD_HOURS, evidence_quote: "welcome to the pub" } }, HAY);
    expect(r.openingHours).toBeNull();
  });

  it("drops an incomplete week", () => {
    const r = verifyExtraction({ ...base, opening_hours: { ...GOOD_HOURS, days: GOOD_HOURS.days.slice(0, 2) } }, HAY);
    expect(r.openingHours).toBeNull();
  });

  it("drops hours when a reported time is not in the quote (a fragment cannot prove a week)", () => {
    // Quote proves Tue-Thu 11am-10pm only; the Fri/Sat 11pm close is not in it.
    const r = verifyExtraction(
      { ...base, opening_hours: { ...GOOD_HOURS, evidence_quote: "Mon closed, Tue-Thu 11am-10pm, Fri-Sat" } },
      HAY
    );
    expect(r.openingHours).toBeNull();
  });

  it("drops hours when the quote names a single day only", () => {
    const page = "hours monday 11 am - 10 pm and more text about the pub follows here";
    const r = verifyExtraction(
      {
        ...base,
        opening_hours: {
          evidence_quote: "monday 11 am - 10 pm",
          days: [{ days_of_week: [0, 1, 2, 3, 4, 5, 6], open: "11:00", close: "22:00" }],
        },
      },
      page
    );
    expect(r.openingHours).toBeNull();
  });

  it("drops hours extrapolated beyond the days the quote names (page lists only Mon and Tue)", () => {
    const page = "hours monday 7:00 am - 9:00 pm tuesday 7:00 am - 9:00 pm";
    const r = verifyExtraction(
      {
        ...base,
        opening_hours: {
          evidence_quote: "Monday 7:00 AM - 9:00 PM Tuesday 7:00 AM - 9:00 PM",
          days: [{ days_of_week: [1, 2, 3, 4, 5, 6, 0], open: "07:00", close: "21:00" }],
        },
      },
      page
    );
    expect(r.openingHours).toBeNull();
  });

  it("accepts day names glued to the times and day ranges", () => {
    const glued = "monday11 am - 12 am tuesday11 am - 12 am wednesday11 am - 12 am thursday11 am - 12 am friday11 am - 1 am saturday11 am - 1 am sunday11 am - 12 am";
    const r = verifyExtraction(
      {
        ...base,
        opening_hours: {
          evidence_quote: glued,
          days: [
            { days_of_week: [0, 1, 2, 3, 4], open: "11:00", close: "00:00" },
            { days_of_week: [5, 6], open: "11:00", close: "01:00" },
          ],
        },
      },
      glued
    );
    expect(r.openingHours?.["5"]).toEqual([["11:00", "01:00"]]);

    const range = "pub hours monday - saturday 11:00am - 11:30pm sunday | 11:00am - 10:00pm";
    const r2 = verifyExtraction(
      {
        ...base,
        opening_hours: {
          evidence_quote: "Monday - Saturday 11:00am - 11:30pm Sunday | 11:00am - 10:00pm",
          days: [
            { days_of_week: [1, 2, 3, 4, 5, 6], open: "11:00", close: "23:30" },
            { days_of_week: [0], open: "11:00", close: "22:00" },
          ],
        },
      },
      range
    );
    expect(r2.openingHours?.["4"]).toEqual([["11:00", "23:30"]]);
  });

  it("accepts an open-daily quote and 24-hour or a.m./p.m. spellings", () => {
    const daily = verifyExtraction(
      {
        ...base,
        opening_hours: { evidence_quote: "Open Daily: 11 AM-10 PM", days: [{ days_of_week: [0, 1, 2, 3, 4, 5, 6], open: "11:00", close: "22:00" }] },
      },
      "welcome. open daily: 11 am-10 pm. see you soon"
    );
    expect(daily.openingHours?.["3"]).toEqual([["11:00", "22:00"]]);

    const dots = verifyExtraction(
      {
        ...base,
        opening_hours: { evidence_quote: "Every day 11:30 a.m. to 9:30 p.m.", days: [{ days_of_week: [0, 1, 2, 3, 4, 5, 6], open: "11:30", close: "21:30" }] },
      },
      "every day 11:30 a.m. to 9:30 p.m. come in"
    );
    expect(dots.openingHours?.["0"]).toEqual([["11:30", "21:30"]]);

    const h24 = verifyExtraction(
      {
        ...base,
        opening_hours: { evidence_quote: "Daily 11:00 - 22:00 hours", days: [{ days_of_week: [0, 1, 2, 3, 4, 5, 6], open: "11:00", close: "22:00" }] },
      },
      "daily 11:00 - 22:00 hours"
    );
    expect(h24.openingHours?.["5"]).toEqual([["11:00", "22:00"]]);
  });

  it("understands midnight and noon wording", () => {
    const r = verifyExtraction(
      {
        ...base,
        opening_hours: { evidence_quote: "Open daily from noon until midnight", days: [{ days_of_week: [0, 1, 2, 3, 4, 5, 6], open: "12:00", close: "00:00" }] },
      },
      "open daily from noon until midnight."
    );
    expect(r.openingHours?.["2"]).toEqual([["12:00", "00:00"]]);
  });

  it("treats missing, null and junk opening_hours as none without throwing", () => {
    expect(verifyExtraction(base, HAY).openingHours).toBeNull();
    expect(verifyExtraction({ ...base, opening_hours: null }, HAY).openingHours).toBeNull();
    expect(verifyExtraction({ ...base, opening_hours: "9 to 5 daily" }, HAY).openingHours).toBeNull();
    expect(verifyExtraction({ ...base, opening_hours: { evidence_quote: 5, days: "x" } }, HAY).openingHours).toBeNull();
  });
});
