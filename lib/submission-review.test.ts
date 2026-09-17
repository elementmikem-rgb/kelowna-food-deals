import { describe, expect, it } from "vitest";
import { resolveSubmissionStatus } from "./submission-review";

describe("resolveSubmissionStatus", () => {
  // The exact bug: a submitter adding a brand-new venue with no specific deal text
  // (e.g. just a name + address, "please add this pub") got silently marked "rejected"
  // -- a status the admin queue never shows -- because totalItems === 0 fell through
  // before isNewVenue was ever checked. Confirmed live 2026-09-16: two real submitter
  // attempts landed as invisible "rejected" rows before this was caught.
  it("always needs review for a new venue, even with zero extracted items and no photo", () => {
    expect(
      resolveSubmissionStatus({ isNewVenue: true, totalItems: 0, hasPhoto: false, pendingCount: 0 })
    ).toBe("needs_review");
  });

  it("needs review for a new venue with items too, not auto_approved", () => {
    expect(
      resolveSubmissionStatus({ isNewVenue: true, totalItems: 3, hasPhoto: false, pendingCount: 0 })
    ).toBe("needs_review");
  });

  it("rejects an existing-venue submission with nothing extracted and no photo", () => {
    expect(
      resolveSubmissionStatus({ isNewVenue: false, totalItems: 0, hasPhoto: false, pendingCount: 0 })
    ).toBe("rejected");
  });

  it("needs review for an existing-venue submission with nothing extracted but a photo attached", () => {
    expect(
      resolveSubmissionStatus({ isNewVenue: false, totalItems: 0, hasPhoto: true, pendingCount: 0 })
    ).toBe("needs_review");
  });

  it("auto-approves an existing-venue submission once every item resolved", () => {
    expect(
      resolveSubmissionStatus({ isNewVenue: false, totalItems: 2, hasPhoto: false, pendingCount: 0 })
    ).toBe("auto_approved");
  });

  it("needs review for an existing-venue submission with items still pending", () => {
    expect(
      resolveSubmissionStatus({ isNewVenue: false, totalItems: 2, hasPhoto: false, pendingCount: 1 })
    ).toBe("needs_review");
  });
});
