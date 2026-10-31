import { describe, it, expect } from "vitest";
import { clientIpFromHeaders, isCloudflareIp, rateLimitBucket } from "./client-ip";

function h(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("isCloudflareIp", () => {
  it("matches addresses inside Cloudflare's published IPv4 ranges (seen live: 104.x and 162.x edges)", () => {
    expect(isCloudflareIp("104.16.0.1")).toBe(true);
    expect(isCloudflareIp("104.23.255.255")).toBe(true);
    expect(isCloudflareIp("162.158.0.1")).toBe(true);
    expect(isCloudflareIp("162.159.255.255")).toBe(true);
    expect(isCloudflareIp("172.67.1.2")).toBe(true);
    expect(isCloudflareIp("131.0.72.5")).toBe(true);
  });

  it("rejects addresses just outside the ranges and ordinary client addresses", () => {
    expect(isCloudflareIp("104.15.255.255")).toBe(false);
    expect(isCloudflareIp("104.32.0.0")).toBe(false);
    expect(isCloudflareIp("162.157.255.255")).toBe(false);
    expect(isCloudflareIp("162.160.0.0")).toBe(false);
    expect(isCloudflareIp("8.8.8.8")).toBe(false);
    expect(isCloudflareIp("192.168.1.10")).toBe(false);
  });

  it("matches Cloudflare IPv6 ranges and rejects other IPv6", () => {
    expect(isCloudflareIp("2606:4700::1")).toBe(true);
    expect(isCloudflareIp("2606:4700:ffff::5")).toBe(true);
    expect(isCloudflareIp("2a06:98c0::1")).toBe(true);
    expect(isCloudflareIp("2a06:98c7:ffff::1")).toBe(true);
    expect(isCloudflareIp("2a06:98c8::1")).toBe(false);
    expect(isCloudflareIp("2001:4860:4860::8888")).toBe(false);
  });

  it("rejects things that are not IP addresses", () => {
    expect(isCloudflareIp("")).toBe(false);
    expect(isCloudflareIp("unknown")).toBe(false);
    expect(isCloudflareIp("104.16.0.1.5")).toBe(false);
    expect(isCloudflareIp("999.1.1.1")).toBe(false);
  });
});

describe("clientIpFromHeaders", () => {
  it("returns the visitor's address from cf-connecting-ip when the request arrived from a Cloudflare edge", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "104.18.40.90", "cf-connecting-ip": "203.0.113.7" }))
    ).toBe("203.0.113.7");
  });

  it("works when the visitor is on IPv6", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "162.158.10.79", "cf-connecting-ip": "2001:db8::42" }))
    ).toBe("2001:db8::42");
  });

  it("ignores a forged cf-connecting-ip when the forwarded address is not a Cloudflare edge", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "198.51.100.9", "cf-connecting-ip": "203.0.113.7" }))
    ).toBe("198.51.100.9");
  });

  it("ignores a cf-connecting-ip that is not a valid address", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "104.18.40.90", "cf-connecting-ip": "not-an-ip" }))
    ).toBe("104.18.40.90");
  });

  it("falls back to the forwarded address when a Cloudflare edge sent no cf-connecting-ip", () => {
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "104.18.40.90" }))).toBe("104.18.40.90");
  });

  it("keeps today's behaviour for everything else: leftmost x-forwarded-for, then x-real-ip, then unknown", () => {
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" }))).toBe("198.51.100.9");
    expect(clientIpFromHeaders(h({ "x-real-ip": "198.51.100.10" }))).toBe("198.51.100.10");
    expect(clientIpFromHeaders(h({}))).toBe("unknown");
  });

  it("trusts cf-connecting-ip only off the leftmost forwarded entry, not a later one an attacker could append", () => {
    // Leftmost is a non-Cloudflare address; a Cloudflare address later in the list must not unlock the header.
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "198.51.100.9, 104.18.40.90", "cf-connecting-ip": "203.0.113.7" }))
    ).toBe("198.51.100.9");
  });
});

describe("rateLimitBucket", () => {
  it("leaves IPv4 addresses and the unknown placeholder alone", () => {
    expect(rateLimitBucket("203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitBucket("unknown")).toBe("unknown");
  });

  it("puts every address in the same IPv6 /64 in one bucket, so rotating addresses does not dodge a limit", () => {
    const a = rateLimitBucket("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    const b = rateLimitBucket("2001:db8:1:2::1");
    const c = rateLimitBucket("2001:0DB8:0001:0002:0:0:0:ffff");
    expect(a).toBe("2001:db8:1:2::/64");
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("keeps different /64 networks apart", () => {
    expect(rateLimitBucket("2001:db8:1:3::1")).not.toBe(rateLimitBucket("2001:db8:1:2::1"));
  });

  it("normalises compressed and upper-case forms", () => {
    expect(rateLimitBucket("2001:DB8::1")).toBe("2001:db8:0:0::/64");
  });

  it("treats an IPv4-mapped IPv6 address as the IPv4 address", () => {
    expect(rateLimitBucket("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });
});
