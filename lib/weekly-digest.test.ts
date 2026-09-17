import { describe, expect, it } from "vitest";
import { buildDigestEmail } from "./weekly-digest";

const base = {
  venueName: "The Test Pub",
  venueId: 1,
  venueOwnerId: 1,
  regionBrandName: "Kelowna Food Deals",
  regionMailingAddress: "123 Main St, Kelowna, BC",
  language: "en" as const,
};

describe("buildDigestEmail", () => {
  it("shows an 'up from' comparison when views increased", () => {
    const { htmlBody, textBody } = buildDigestEmail({ ...base, thisWeekViews: 142, lastWeekViews: 89, rank: null });
    expect(htmlBody).toContain("(up from 89)");
    expect(textBody).toContain("(up from 89)");
  });

  it("shows a 'down from' comparison when views decreased", () => {
    const { htmlBody } = buildDigestEmail({ ...base, thisWeekViews: 40, lastWeekViews: 89, rank: null });
    expect(htmlBody).toContain("(down from 89)");
  });

  it("shows no comparison when there's no prior-week baseline", () => {
    const { htmlBody } = buildDigestEmail({ ...base, thisWeekViews: 12, lastWeekViews: 0, rank: null });
    expect(htmlBody).not.toContain("up from");
    expect(htmlBody).not.toContain("down from");
  });

  it("includes the rank callout for a top-3 placement", () => {
    const { htmlBody, textBody } = buildDigestEmail({ ...base, thisWeekViews: 200, lastWeekViews: 150, rank: 1 });
    expect(htmlBody).toContain("#1 most-viewed venue");
    expect(textBody).toContain("#1 most-viewed venue");
  });

  it("omits the rank callout outside the top 3", () => {
    const { htmlBody } = buildDigestEmail({ ...base, thisWeekViews: 5, lastWeekViews: 5, rank: 8 });
    expect(htmlBody).not.toContain("most-viewed venue");
  });

  it("omits the rank callout when rank is null (not ranked this week)", () => {
    const { htmlBody } = buildDigestEmail({ ...base, thisWeekViews: 3, lastWeekViews: 1, rank: null });
    expect(htmlBody).not.toContain("most-viewed venue");
  });

  it("includes a working unsubscribe link and the region's mailing address (CASL)", () => {
    const { htmlBody } = buildDigestEmail({ ...base, thisWeekViews: 10, lastWeekViews: 5, rank: null });
    expect(htmlBody).toContain("/api/owner/digest-unsubscribe");
    expect(htmlBody).toContain(base.regionMailingAddress);
  });

  it("links the CTA to the owner's dashboard for this venue", () => {
    const { htmlBody } = buildDigestEmail({ ...base, thisWeekViews: 10, lastWeekViews: 5, rank: null });
    expect(htmlBody).toContain(`/owner/venue/${base.venueId}`);
  });
});
