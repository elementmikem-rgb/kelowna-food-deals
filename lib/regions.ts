import { db, regions, provinces, countries } from "@/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { Region, Province, Country } from "@/db/schema";

// Region config changes rarely (a human edits it, not a request), so a short
// in-memory cache avoids a Postgres round trip on every single page render
// without risking a stale region surviving more than a minute after an edit.
const CACHE_TTL_MS = 60_000;
const byDomain = new Map<string, { region: Region | null; expiresAt: number }>();
const bySlug = new Map<string, { region: Region | null; expiresAt: number }>();
const byId = new Map<number, { region: Region | null; expiresAt: number }>();
const provinceById = new Map<number, { province: Province | null; expiresAt: number }>();
const countryById = new Map<number, { country: Country | null; expiresAt: number }>();

export async function getRegionByDomain(domain: string): Promise<Region | null> {
  const cached = byDomain.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.region;

  const [row] = await db.select().from(regions).where(eq(regions.domain, domain)).limit(1);
  const region = row ?? null;
  byDomain.set(domain, { region, expiresAt: Date.now() + CACHE_TTL_MS });
  return region;
}

// Used for path-based region resolution (todaystab.com/kelowna, /penticton) --
// proxy.ts resolves the first URL segment against this and sets x-region-id
// exactly as it already does from the Host header for the legacy per-region
// domains, so every existing getCurrentRegion() call site keeps working
// unchanged regardless of which resolution path produced the header.
export async function getRegionBySlug(slug: string): Promise<Region | null> {
  const cached = bySlug.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.region;

  const [row] = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1);
  const region = row ?? null;
  bySlug.set(slug, { region, expiresAt: Date.now() + CACHE_TTL_MS });
  return region;
}

export async function getRegionById(id: number): Promise<Region | null> {
  const cached = byId.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.region;

  const [row] = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
  const region = row ?? null;
  byId.set(id, { region, expiresAt: Date.now() + CACHE_TTL_MS });
  return region;
}

async function getProvinceById(id: number): Promise<Province | null> {
  const cached = provinceById.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.province;
  const [row] = await db.select().from(provinces).where(eq(provinces.id, id)).limit(1);
  const province = row ?? null;
  provinceById.set(id, { province, expiresAt: Date.now() + CACHE_TTL_MS });
  return province;
}

async function getCountryById(id: number): Promise<Country | null> {
  const cached = countryById.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.country;
  const [row] = await db.select().from(countries).where(eq(countries.id, id)).limit(1);
  const country = row ?? null;
  countryById.set(id, { country, expiresAt: Date.now() + CACHE_TTL_MS });
  return country;
}

export interface RegionContext {
  region: Region;
  province: Province;
  country: Country;
  timezone: string; // province.timezone -- the only place it's stored (see Task 1)
  currency: string; // country.currency -- the only place it's stored
}

export async function getRegionContext(region: Region): Promise<RegionContext> {
  const province = await getProvinceById(region.provinceId);
  if (!province) {
    throw new Error(`getRegionContext: region ${region.id} points at province ${region.provinceId}, which does not exist`);
  }
  const country = await getCountryById(province.countryId);
  if (!country) {
    throw new Error(`getRegionContext: province ${province.id} points at country ${province.countryId}, which does not exist`);
  }
  return { region, province, country, timezone: province.timezone, currency: country.currency };
}

const PRIMARY_REGION_DOMAIN = process.env.PRIMARY_REGION_DOMAIN ?? "kelownafooddeals.shop";

// Resolves the region config for static/ISR-rendered pages (layout metadata,
// theming, sitemap, robots.txt, the site header) -- these must never call
// headers()/cookies()/searchParams, since any Dynamic API in a route's render
// tree forces the whole route to render live on every request, defeating
// Next.js's static caching. getCurrentRegion() (below) is for genuinely
// per-request contexts (API routes, admin pages) where that's already true
// regardless. Once a second region exists behind its own domain, this needs
// to become domain-aware via routing (not headers()) -- tracked as deferred
// work in the multi-region spec.
export async function getPrimaryRegion(): Promise<Region> {
  const region = await getRegionByDomain(PRIMARY_REGION_DOMAIN);
  if (!region) {
    throw new Error(`getPrimaryRegion: no region found for domain "${PRIMARY_REGION_DOMAIN}"`);
  }
  return region;
}

export async function getCurrentRegion(): Promise<Region> {
  const regionId = (await headers()).get("x-region-id");
  if (!regionId) {
    throw new Error("No x-region-id header -- proxy.ts should set this on every request");
  }
  const region = await getRegionById(Number(regionId));
  if (!region) {
    throw new Error(`x-region-id header points at a region id (${regionId}) with no matching row`);
  }
  return region;
}
