import { describe, it, expect } from "vitest";
import { SECURITY_HEADERS } from "./security-headers";

const get = (key: string) => SECURITY_HEADERS.find((h) => h.key === key)?.value;

describe("SECURITY_HEADERS", () => {
  it("keeps other sites from framing ours", () => {
    expect(get("Content-Security-Policy")).toBe("frame-ancestors 'self'");
    expect(get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("stops MIME sniffing and trims the referrer", () => {
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("still lets the site use the visitor's location, which sort-by-nearest needs", () => {
    expect(get("Permissions-Policy")).toContain("geolocation=(self)");
  });

  it("does not add a script-blocking CSP that could blank a page", () => {
    expect(get("Content-Security-Policy")).not.toMatch(/script-src|default-src/);
  });

  it("keeps HSTS exactly as it was", () => {
    expect(get("Strict-Transport-Security")).toBe("max-age=31536000");
  });
});
