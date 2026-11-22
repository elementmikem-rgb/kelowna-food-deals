import { describe, it, expect } from "vitest";
import { classifyBrevoEvent, extractSendId } from "./brevo-events";

describe("extractSendId", () => {
  it("reads the send-<id> tag", () => {
    expect(extractSendId(["first_contact", "send-42"])).toBe(42);
  });
  it("returns null when no tag matches", () => {
    expect(extractSendId(["send-", "send-abc", "xsend-5"])).toBeNull();
    expect(extractSendId(undefined)).toBeNull();
    expect(extractSendId([])).toBeNull();
  });
});

describe("classifyBrevoEvent", () => {
  it("keeps open and click handling", () => {
    expect(classifyBrevoEvent("opened")).toEqual({ type: "open" });
    expect(classifyBrevoEvent("unique_opened")).toEqual({ type: "open" });
    expect(classifyBrevoEvent("click")).toEqual({ type: "click" });
  });

  it("is case-insensitive", () => {
    expect(classifyBrevoEvent("Hard_Bounce").type).toBe("hard_failure");
  });

  it("treats hard_bounce as a hard failure with the existing message", () => {
    expect(classifyBrevoEvent("hard_bounce")).toEqual({ type: "hard_failure", errorMessage: "hard bounce" });
    expect(classifyBrevoEvent("hard_bounce", "550 no such user")).toEqual({
      type: "hard_failure",
      errorMessage: "550 no such user",
    });
  });

  it("treats blocked and invalid_email as hard failures", () => {
    expect(classifyBrevoEvent("blocked")).toEqual({ type: "hard_failure", errorMessage: "blocked by Brevo" });
    expect(classifyBrevoEvent("invalid_email")).toEqual({ type: "hard_failure", errorMessage: "invalid email" });
    expect(classifyBrevoEvent("blocked", "blacklisted")).toEqual({ type: "hard_failure", errorMessage: "blacklisted" });
  });

  it("suppresses the venue on a spam complaint", () => {
    expect(classifyBrevoEvent("spam")).toEqual({ type: "suppress", errorMessage: "spam complaint" });
    expect(classifyBrevoEvent("complaint")).toEqual({ type: "suppress", errorMessage: "spam complaint" });
  });

  it("suppresses the venue on a Brevo unsubscribe", () => {
    expect(classifyBrevoEvent("unsubscribed")).toEqual({ type: "suppress", errorMessage: "unsubscribed via Brevo" });
    expect(classifyBrevoEvent("unsubscribe")).toEqual({ type: "suppress", errorMessage: "unsubscribed via Brevo" });
  });

  it("does not suppress or fail on a soft bounce", () => {
    expect(classifyBrevoEvent("soft_bounce")).toEqual({ type: "soft_bounce" });
  });

  it("ignores everything else", () => {
    for (const e of ["request", "delivered", "deferred", "proxy_open", "unique_proxy_open", "", undefined]) {
      expect(classifyBrevoEvent(e)).toEqual({ type: "ignore" });
    }
  });
});
