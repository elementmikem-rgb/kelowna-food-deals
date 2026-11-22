import { describe, expect, it } from "vitest";
import { parseDays, parseTimeRange, suggestSpecial } from "./reply-prefill";

describe("parseDays", () => {
  it("returns empty array when no days are mentioned", () => {
    expect(parseDays("nous offrons des promotions speciales")).toEqual([]);
  });

  it("handles tous les jours", () => {
    expect(parseDays("tous les jours nous sommes ouverts")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("handles every day", () => {
    expect(parseDays("every day we have specials")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("handles daily", () => {
    expect(parseDays("daily specials available")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("handles chaque jour", () => {
    expect(parseDays("chaque jour de la semaine")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("handles quotidien", () => {
    expect(parseDays("promo quotidien")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("handles single French day plural", () => {
    expect(parseDays("tous les samedis soir")).toEqual([6]);
  });

  it("handles single English day", () => {
    expect(parseDays("every Tuesday evening")).toEqual([2]);
  });

  it("handles French range du...au", () => {
    expect(parseDays("du lundi au vendredi")).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles English range Monday to Friday", () => {
    expect(parseDays("Monday to Friday")).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles French range X a Y (accent-normalized)", () => {
    expect(parseDays("lundi a vendredi")).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles abbreviated Mon-Fri range", () => {
    expect(parseDays("Mon-Fri special")).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles French list with et", () => {
    expect(parseDays("lundi et mardi seulement")).toEqual([1, 2]);
  });

  it("handles English list with and", () => {
    expect(parseDays("Tuesday, Thursday and Friday")).toEqual([2, 4, 5]);
  });

  it("handles multiple French day names", () => {
    expect(parseDays("vendredi et samedi en soiree")).toEqual([5, 6]);
  });

  it("handles plural French days with accent normalization", () => {
    expect(parseDays("les mardis et jeudis")).toEqual([2, 4]);
  });

  it("handles abbreviated English days tues and thurs", () => {
    expect(parseDays("tues and thurs nights")).toEqual([2, 4]);
  });

  it("ignores quoted lines starting with >", () => {
    const text = "nous avons des specials le samedi\n> Le mardi aussi\n> lundi et mercredi";
    expect(parseDays(text)).toEqual([6]);
  });

  it("ignores everything after a line of 10+ underscores", () => {
    const text = "specials le vendredi\n__________\nlundi au samedi aussi";
    expect(parseDays(text)).toEqual([5]);
  });

  it("ignores everything after De :", () => {
    const text = "specials le jeudi\nDe : quelquun\nlundi au vendredi";
    expect(parseDays(text)).toEqual([4]);
  });

  it("ignores everything after From:", () => {
    const text = "wing night saturday\nFrom: someone@example.com\nMonday to Friday";
    expect(parseDays(text)).toEqual([6]);
  });

  it("handles week-wrapping range (Friday to Monday)", () => {
    const days = parseDays("du vendredi au lundi");
    expect(days).toEqual([0, 1, 5, 6]);
  });

  it("handles Wednesday to Saturday range", () => {
    expect(parseDays("Wednesday to Saturday")).toEqual([3, 4, 5, 6]);
  });
});

describe("parseTimeRange", () => {
  it("returns nulls when no time is mentioned", () => {
    expect(parseTimeRange("nous avons un special")).toEqual({ start: null, end: null });
  });

  it("handles de Xh a Yh range", () => {
    expect(parseTimeRange("de 16h a 18h, biere")).toEqual({ start: "16:00", end: "18:00" });
  });

  it("handles Xh a Yh range without de", () => {
    expect(parseTimeRange("16h a 18h")).toEqual({ start: "16:00", end: "18:00" });
  });

  it("handles Xh30 format in range", () => {
    expect(parseTimeRange("de 16h30 a 18h")).toEqual({ start: "16:30", end: "18:00" });
  });

  it("handles 4pm-6pm", () => {
    expect(parseTimeRange("happy hour 4pm-6pm")).toEqual({ start: "16:00", end: "18:00" });
  });

  it("handles 4 pm to 6 pm", () => {
    expect(parseTimeRange("4 pm to 6 pm")).toEqual({ start: "16:00", end: "18:00" });
  });

  it("handles 5-8pm with both values treated as pm", () => {
    expect(parseTimeRange("5-8pm special")).toEqual({ start: "17:00", end: "20:00" });
  });

  it("handles 17:00-19:00", () => {
    expect(parseTimeRange("17:00-19:00")).toEqual({ start: "17:00", end: "19:00" });
  });

  it("handles a partir de 17h (start only)", () => {
    expect(parseTimeRange("a partir de 17h")).toEqual({ start: "17:00", end: null });
  });

  it("handles from 5pm (start only)", () => {
    expect(parseTimeRange("from 5pm")).toEqual({ start: "17:00", end: null });
  });

  it("handles jusqu a 2h (end only)", () => {
    expect(parseTimeRange("jusqu a 2h")).toEqual({ start: null, end: "02:00" });
  });

  it("soir alone gives no time", () => {
    expect(parseTimeRange("tous les samedis soir")).toEqual({ start: null, end: null });
  });

  it("handles de 12h a 14h", () => {
    expect(parseTimeRange("de 12h a 14h")).toEqual({ start: "12:00", end: "14:00" });
  });

  it("handles just a 2h end-only with accent normalization", () => {
    expect(parseTimeRange("jusqua 2h")).toEqual({ start: null, end: "02:00" });
  });

  it("handles 10am-2pm", () => {
    expect(parseTimeRange("brunch 10am-2pm")).toEqual({ start: "10:00", end: "14:00" });
  });
});

describe("suggestSpecial", () => {
  it("parses French wing night example", () => {
    const result = suggestSpecial(
      "oui nous organisons des evenements et comme promo actuel nous avons tous les samedis soir ailes de poulet a 1$"
    );
    expect(result).not.toBeNull();
    expect(result!.category).toBe("wing_night");
    expect(result!.priceCents).toBe(100);
    expect(result!.daysOfWeek).toEqual([6]);
    expect(result!.title).toMatch(/aile/i);
    expect(result!.startTime).toBeNull();
    expect(result!.endTime).toBeNull();
  });

  it("parses French happy hour example", () => {
    const result = suggestSpecial("Happy hour du lundi au vendredi de 16h a 18h, biere 5$");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("happy_hour");
    expect(result!.priceCents).toBe(500);
    expect(result!.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    expect(result!.startTime).toBe("16:00");
    expect(result!.endTime).toBe("18:00");
  });

  it("parses English wing night example", () => {
    const result = suggestSpecial("We do wing night every Tuesday 5-8pm, $0.75 wings");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("wing_night");
    expect(result!.priceCents).toBe(75);
    expect(result!.daysOfWeek).toEqual([2]);
    expect(result!.startTime).toBe("17:00");
    expect(result!.endTime).toBe("20:00");
  });

  it("returns null for negative French reply aucun", () => {
    expect(suggestSpecial("Nous n'avons aucun happy hours")).toBeNull();
  });

  it("returns null for negative English reply no specials", () => {
    expect(suggestSpecial("we do not have any specials")).toBeNull();
  });

  it("returns null for pas de", () => {
    expect(suggestSpecial("nous n'avons pas de promotions")).toBeNull();
  });

  it("returns null for unrecognisable reply (no price, no days, no keyword)", () => {
    expect(suggestSpecial("Merci de votre message")).toBeNull();
  });

  it("handles 5 a 7 happy hour category", () => {
    const result = suggestSpecial("5 a 7 chaque jeudi, consommations a 4$");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("happy_hour");
    expect(result!.daysOfWeek).toEqual([4]);
    expect(result!.priceCents).toBe(400);
  });

  it("handles apero category", () => {
    const result = suggestSpecial("apero le vendredi de 17h a 19h");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("happy_hour");
    expect(result!.daysOfWeek).toEqual([5]);
    expect(result!.startTime).toBe("17:00");
    expect(result!.endTime).toBe("19:00");
  });

  it("handles food special pizza", () => {
    const result = suggestSpecial("pizza night every Wednesday, large pizza $15");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("food_special");
    expect(result!.daysOfWeek).toEqual([3]);
    expect(result!.priceCents).toBe(1500);
  });

  it("handles poutine food special", () => {
    const result = suggestSpecial("poutine a 8$ tous les lundis");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("food_special");
    expect(result!.daysOfWeek).toEqual([1]);
    expect(result!.priceCents).toBe(800);
  });

  it("ignores quoted history when parsing days", () => {
    const text =
      "wing night every Thursday $0.99\n> Happy hour lundi au vendredi\n> wing night mardi";
    const result = suggestSpecial(text);
    expect(result).not.toBeNull();
    expect(result!.daysOfWeek).toEqual([4]);
  });

  it("handles price with comma decimal", () => {
    const result = suggestSpecial("burger special samedi, 5,50 $");
    expect(result).not.toBeNull();
    expect(result!.priceCents).toBe(550);
  });

  it("handles $12.99 price", () => {
    const result = suggestSpecial("brunch special Sunday $12.99");
    expect(result).not.toBeNull();
    expect(result!.priceCents).toBe(1299);
    expect(result!.category).toBe("food_special");
  });

  it("ignores year 2026 as a price", () => {
    const result = suggestSpecial("specials depuis 2026, wing night mardi $1");
    expect(result).not.toBeNull();
    expect(result!.priceCents).toBe(100);
  });

  it("title is at most 60 characters", () => {
    const result = suggestSpecial("wing night every Wednesday 5-8pm $0.99");
    expect(result).not.toBeNull();
    expect(result!.title.length).toBeLessThanOrEqual(60);
  });

  it("description is null when not explicitly provided", () => {
    const result = suggestSpecial("wing night every Tuesday $1");
    expect(result).not.toBeNull();
    expect(result!.description).toBeNull();
  });

  it("handles Mon-Fri abbreviated range with time", () => {
    const result = suggestSpecial("happy hour Mon-Fri 4pm-6pm $5 drinks");
    expect(result).not.toBeNull();
    expect(result!.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    expect(result!.startTime).toBe("16:00");
    expect(result!.endTime).toBe("18:00");
  });

  it("returns non-null when no day but has price and keyword", () => {
    const result = suggestSpecial("wing night $1 per wing");
    expect(result).not.toBeNull();
    expect(result!.daysOfWeek).toEqual([]);
    expect(result!.priceCents).toBe(100);
  });

  it("returns other category for unclassified keyword", () => {
    const result = suggestSpecial("karaoke night every Friday, $3 cover");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("other");
    expect(result!.daysOfWeek).toEqual([5]);
  });

  it("ignores quoted history lines starting with > for days and price", () => {
    const text =
      "happy hour vendredi 5$ verre\n> nous n'avons rien le samedi\n> prix speciaux 1000$";
    const result = suggestSpecial(text);
    expect(result).not.toBeNull();
    expect(result!.daysOfWeek).toEqual([5]);
    expect(result!.priceCents).toBe(500);
  });

  it("handles nachos food special", () => {
    const result = suggestSpecial("nachos night every Thursday, nachos $10");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("food_special");
    expect(result!.priceCents).toBe(1000);
  });

  it("title first letter is capitalised", () => {
    const result = suggestSpecial("wing night mardi $1");
    expect(result).not.toBeNull();
    expect(result!.title[0]).toBe(result!.title[0].toUpperCase());
  });

  it("handles brunch food special with time", () => {
    const result = suggestSpecial("brunch every Sunday 10am-2pm $25");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("food_special");
    expect(result!.startTime).toBe("10:00");
    expect(result!.endTime).toBe("14:00");
  });

  it("returns null when only year-like number and no keyword or days", () => {
    expect(suggestSpecial("open since 2019")).toBeNull();
  });
});
