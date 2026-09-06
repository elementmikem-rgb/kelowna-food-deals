import { describe, it, expect, beforeAll } from "vitest";
import { signBookingToken, verifyBookingToken } from "./booking-token";

beforeAll(() => {
  process.env.BOOKING_TOKEN_SECRET = "test-secret-do-not-use-in-prod";
});

describe("booking token round trip", () => {
  it("returns the original payload when the token is valid and unexpired", async () => {
    const token = await signBookingToken({ email: "owner@venue.com" }, 60_000);
    const result = await verifyBookingToken<{ email: string }>(token);
    expect(result?.email).toBe("owner@venue.com");
  });

  it("rejects a token with a tampered signature", async () => {
    const token = await signBookingToken({ email: "owner@venue.com" }, 60_000);
    const [body] = token.split(".");
    const tampered = `${body}.0000000000000000000000000000000000000000000000000000000000000000`;
    const result = await verifyBookingToken<{ email: string }>(tampered);
    expect(result).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signBookingToken({ email: "owner@venue.com" }, -1);
    const result = await verifyBookingToken<{ email: string }>(token);
    expect(result).toBeNull();
  });

  it("rejects a malformed token with no signature separator", async () => {
    const result = await verifyBookingToken<{ email: string }>("not-a-real-token");
    expect(result).toBeNull();
  });
});
