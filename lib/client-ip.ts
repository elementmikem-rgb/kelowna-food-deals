import { isIPv4, isIPv6 } from "node:net";

// Why this exists (found by the 2026-10 security audit, confirmed live 2026-10-31):
// todaystab.com sits behind Cloudflare, and Railway's proxy then reports the Cloudflare edge
// address as the client in X-Forwarded-For. The rate limiter used that value directly, so every
// limit was keyed on a Cloudflare edge IP (104.x, 162.x ...), not on the visitor: limits were shared
// between unrelated visitors and an attacker was spread across edges, so caps were rarely reached.
// Cloudflare tells the origin the real visitor in the CF-Connecting-IP header.
//
// That header is only trustworthy when the request really came through Cloudflare, because anyone
// who reaches the origin directly could send a fake one. So it is used only when the address Railway
// reports (the leftmost X-Forwarded-For entry, or X-Real-IP) is itself inside Cloudflare's published
// ranges. Everything else keeps the previous behaviour. This is strictly no worse than before; it
// does not fix X-Forwarded-For spoofing by someone who reaches the origin directly (separate audit
// item: lock the origin to Cloudflare, for example with a secret header set by a Cloudflare rule).

// Cloudflare's published ranges, https://www.cloudflare.com/ips-v4 and /ips-v6, fetched 2026-10-31.
// They change rarely; refresh from those URLs if Cloudflare announces a change.
const CLOUDFLARE_V4 = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
  "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
  "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];
const CLOUDFLARE_V6 = [
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32",
  "2a06:98c0::/29", "2c0f:f248::/32",
];

// BigInt() calls, not 0n literals: this project's TypeScript target is below ES2020.
const ZERO = BigInt(0);
const EIGHT = BigInt(8);
const SIXTEEN = BigInt(16);
const MASK16 = BigInt(0xffff);

function parseV4(ip: string): bigint | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = ZERO;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    value = (value << EIGHT) | BigInt(n);
  }
  return value;
}

function parseV6(input: string): bigint | null {
  let s = input;
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  const embedded = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (embedded) {
    const n = parseV4(embedded[1]);
    if (n === null) return null;
    s = s.slice(0, -embedded[1].length) + ((n >> SIXTEEN) & MASK16).toString(16) + ":" + (n & MASK16).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  }
  let value = ZERO;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
    value = (value << SIXTEEN) | BigInt(parseInt(g, 16));
  }
  return value;
}

interface Cidr {
  base: bigint;
  bits: number;
  total: number;
}

function parseCidr(cidr: string, family: 4 | 6): Cidr {
  const [addr, len] = cidr.split("/");
  const base = family === 4 ? parseV4(addr) : parseV6(addr);
  if (base === null) throw new Error(`bad CIDR in client-ip.ts: ${cidr}`);
  return { base, bits: Number(len), total: family === 4 ? 32 : 128 };
}

const V4_RANGES = CLOUDFLARE_V4.map((c) => parseCidr(c, 4));
const V6_RANGES = CLOUDFLARE_V6.map((c) => parseCidr(c, 6));

function inRange(value: bigint, r: Cidr): boolean {
  const shift = BigInt(r.total - r.bits);
  return value >> shift === r.base >> shift;
}

export function isCloudflareIp(ip: string): boolean {
  const s = ip.trim();
  if (isIPv4(s)) {
    const v = parseV4(s);
    return v !== null && V4_RANGES.some((r) => inRange(v, r));
  }
  if (isIPv6(s)) {
    const v = parseV6(s);
    return v !== null && V6_RANGES.some((r) => inRange(v, r));
  }
  return false;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded ? forwarded.split(",")[0]!.trim() : "";
  const peer = first || headers.get("x-real-ip") || "";
  if (peer && isCloudflareIp(peer)) {
    const visitor = headers.get("cf-connecting-ip")?.trim();
    if (visitor && (isIPv4(visitor) || isIPv6(visitor))) return visitor;
  }
  return peer || "unknown";
}
