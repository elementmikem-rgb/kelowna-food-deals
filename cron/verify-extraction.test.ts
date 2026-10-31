import { describe, expect, it } from "vitest";
import { verifyExtraction } from "./extract";

// Source text as foxpub.ca/about-us reads once whitespace is collapsed: the Monday wings line is
// immediately followed by a separate "$1 OFF" pint line.
const FOX_PAGE =
  "MONDAY 1/2 PRICE CHICKEN WINGS (3PM-CLOSE) $1 OFF PHILLIPS STONE FRUIT SOUR ALE PINTS $1 OFF OKANAGAN SPRING 1516 PINTS TUESDAY BUY ONE BURGER + GET A 2ND BURGER FOR 1/2 PRICE!";

function special(overrides: Record<string, unknown>) {
  return {
    title: "Chicken wings (Monday)",
    description: "1/2 price chicken wings, 3pm-close, Monday",
    price_cents: null,
    days_of_week: [1],
    is_monthly: false,
    start_time: "15:00",
    end_time: null,
    category: "wing_night",
    confidence: 0.9,
    extraction_notes: null,
    evidence_quote: "monday 1/2 price chicken wings (3pm-close)",
    ...overrides,
  };
}

function run(s: Record<string, unknown>, page = FOX_PAGE) {
  const haystack = page.replace(/\s+/g, " ").trim().toLowerCase();
  return verifyExtraction({ specials: [s], events: [], menu_items: [] }, haystack).specials;
}

describe("verifyExtraction: a saved deal must not swap in the next line's discount", () => {
  it("keeps a clean half-price quote", () => {
    expect(run(special({}))).toHaveLength(1);
  });

  it("keeps a clean dollars-off quote", () => {
    expect(
      run(
        special({
          title: "Phillips pints",
          description: "$1 off Phillips stone fruit sour ale pints",
          evidence_quote: "$1 off phillips stone fruit sour ale pints",
          category: "happy_hour",
        })
      )
    ).toHaveLength(1);
  });

  it("drops wings saved as '$1 off' when the quote leads with half price (seen live 2026-10-26)", () => {
    expect(
      run(
        special({
          description: "Chicken wings 3pm-close Monday, $1 off",
          evidence_quote: "monday 1/2 price chicken wings (3pm-close) $1 off",
        })
      )
    ).toHaveLength(0);
  });

  it("drops it when the quote runs on into the whole next pint line too", () => {
    expect(
      run(
        special({
          description: "Wings, $1 off",
          evidence_quote: "monday 1/2 price chicken wings (3pm-close) $1 off phillips stone fruit sour ale pints",
        })
      )
    ).toHaveLength(0);
  });

  it("keeps a row whose quote holds two deals but whose saved text still says half price (Hidden Spot, Gramma's Pub)", () => {
    const page = "WEDNESDAY 1/2 PRICE WINGS $5 OFF BEER BUCKETS";
    expect(
      run(
        special({
          title: "Wednesday 1/2 price wings",
          description: "Wednesday daily special",
          days_of_week: [3],
          evidence_quote: "wednesday 1/2 price wings $5 off beer buckets",
        }),
        page
      )
    ).toHaveLength(1);
    const page2 = "FRIDAY 1/2 PRICE WINGS/DRY RIBS & $2 OFF JUGS";
    expect(
      run(
        special({
          title: "Friday Wings/Dry Ribs",
          description: "1/2 price wings/dry ribs and $2 off jugs after 12pm",
          days_of_week: [5],
          evidence_quote: "friday 1/2 price wings/dry ribs & $2 off jugs",
        }),
        page2
      )
    ).toHaveLength(1);
  });

  it("keeps half-litre wording (1/2 L) paired with a dollars-off deal", () => {
    const page = "WED WINE $7 OFF 1/2 L | $10 OFF BOTTLE (750 ML)";
    expect(
      run(
        special({
          title: "Wine $7 off 1/2 L | $10 off bottle",
          description: "$7 off 1/2 L wine, $10 off 750 ml bottle",
          days_of_week: [3],
          category: "happy_hour",
          evidence_quote: "wed wine $7 off 1/2 l | $10 off bottle (750 ml)",
        }),
        page
      )
    ).toHaveLength(1);
  });
});
