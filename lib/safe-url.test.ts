import { describe, it, expect } from "vitest";
import { safeHttpUrl, safeUrlOnHost } from "./safe-url";

describe("safeHttpUrl", () => {
  it("keeps web addresses", () => {
    expect(safeHttpUrl("https://www.showpass.com/x/")).toBe("https://www.showpass.com/x/");
    expect(safeHttpUrl("http://example.com/a")).toBe("http://example.com/a");
  });
  it("drops script, data and other schemes, and junk", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("//evil.example")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });
});

describe("safeUrlOnHost", () => {
  it("accepts https on the host or a subdomain only", () => {
    expect(safeUrlOnHost("https://www.showpass.com/x/", "showpass.com")).toBe("https://www.showpass.com/x/");
    expect(safeUrlOnHost("https://showpass.com/x/", "showpass.com")).toBe("https://showpass.com/x/");
  });
  it("rejects other hosts, look-alikes and plain http", () => {
    expect(safeUrlOnHost("https://evil.com/showpass.com", "showpass.com")).toBeNull();
    expect(safeUrlOnHost("https://notshowpass.com/x", "showpass.com")).toBeNull();
    expect(safeUrlOnHost("https://showpass.com.evil.com/x", "showpass.com")).toBeNull();
    expect(safeUrlOnHost("http://www.showpass.com/x", "showpass.com")).toBeNull();
    expect(safeUrlOnHost("javascript:alert(1)", "showpass.com")).toBeNull();
  });
});
