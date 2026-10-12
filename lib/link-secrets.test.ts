import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { buildUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";
import { buildVenueVerifyToken, verifyVenueVerifyToken } from "./venue-verify";
import { buildDigestUnsubscribeToken, verifyDigestUnsubscribeToken } from "./owner-digest-unsubscribe";

const OLD = "old-secret-from-a-local-machine";
const CURRENT = "current-live-secret";
const sign = (secret: string, input: string) => crypto.createHmac("sha256", secret).update(input).digest("hex");

describe("links signed with a previous secret keep working", () => {
  const saved = { cur: process.env.ADMIN_SESSION_SECRET, prev: process.env.ADMIN_SESSION_SECRET_PREVIOUS };
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = CURRENT;
    process.env.ADMIN_SESSION_SECRET_PREVIOUS = OLD;
  });
  afterEach(() => {
    if (saved.cur === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = saved.cur;
    if (saved.prev === undefined) delete process.env.ADMIN_SESSION_SECRET_PREVIOUS; else process.env.ADMIN_SESSION_SECRET_PREVIOUS = saved.prev;
  });

  it("unsubscribe: accepts current and previous, rejects others", () => {
    expect(verifyUnsubscribeToken(7, buildUnsubscribeToken(7))).toBe(true);
    expect(verifyUnsubscribeToken(7, sign(OLD, "7"))).toBe(true);
    expect(verifyUnsubscribeToken(7, sign("nope", "7"))).toBe(false);
    expect(verifyUnsubscribeToken(8, sign(OLD, "7"))).toBe(false);
  });

  it("venue verify: accepts current and previous, rejects others", () => {
    expect(verifyVenueVerifyToken(7, buildVenueVerifyToken(7))).toBe(true);
    expect(verifyVenueVerifyToken(7, sign(OLD, "verify:7"))).toBe(true);
    expect(verifyVenueVerifyToken(7, sign("nope", "verify:7"))).toBe(false);
  });

  it("owner digest unsubscribe: accepts current and previous, rejects others", () => {
    expect(verifyDigestUnsubscribeToken(7, buildDigestUnsubscribeToken(7))).toBe(true);
    expect(verifyDigestUnsubscribeToken(7, sign(OLD, "digest:7"))).toBe(true);
    expect(verifyDigestUnsubscribeToken(7, sign("nope", "digest:7"))).toBe(false);
  });

  it("new links are always signed with the current secret", () => {
    expect(buildUnsubscribeToken(7)).toBe(sign(CURRENT, "7"));
  });

  it("works with no previous secret set", () => {
    delete process.env.ADMIN_SESSION_SECRET_PREVIOUS;
    expect(verifyUnsubscribeToken(7, buildUnsubscribeToken(7))).toBe(true);
    expect(verifyUnsubscribeToken(7, sign(OLD, "7"))).toBe(false);
  });
});
