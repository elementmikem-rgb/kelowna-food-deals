import { describe, it, expect, beforeEach } from "vitest";
import { buildAdminSessionCookie, verifyAdminCookie } from "./admin-auth";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret-not-real";
});

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("verifyAdminCookie", () => {
  it("accepts a freshly built session cookie", async () => {
    expect(await verifyAdminCookie(await buildAdminSessionCookie())).toBe(true);
  });

  it("rejects missing, empty and malformed values", async () => {
    expect(await verifyAdminCookie(undefined)).toBe(false);
    expect(await verifyAdminCookie("")).toBe(false);
    expect(await verifyAdminCookie("no-dot-here")).toBe(false);
    expect(await verifyAdminCookie("a.b")).toBe(false);
  });

  it("rejects a tampered payload or signature", async () => {
    const good = await buildAdminSessionCookie();
    const [payload, sig] = [good.slice(0, good.lastIndexOf(".")), good.slice(good.lastIndexOf(".") + 1)];
    const forged = b64url(JSON.stringify({ sid: "x", exp: Date.now() + 1e9 }));
    expect(await verifyAdminCookie(`${forged}.${sig}`)).toBe(false);
    // Change the last hex digit to a DIFFERENT one (a fixed "0" would leave the signature
    // untouched about 1 time in 16 and make this assertion flaky).
    const flipped = sig.endsWith("0") ? "1" : "0";
    expect(await verifyAdminCookie(`${payload}.${sig.slice(0, -1)}${flipped}`)).toBe(false);
  });

  it("rejects a cookie signed with a different secret", async () => {
    const good = await buildAdminSessionCookie();
    process.env.ADMIN_SESSION_SECRET = "a-different-secret";
    expect(await verifyAdminCookie(good)).toBe(false);
  });

  it("rejects everything when no secret is configured", async () => {
    const good = await buildAdminSessionCookie();
    delete process.env.ADMIN_SESSION_SECRET;
    expect(await verifyAdminCookie(good)).toBe(false);
  });
});
