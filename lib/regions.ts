import { db, regions } from "@/db";
import { eq } from "drizzle-orm";
import type { Region } from "@/db/schema";

// Region config changes rarely (a human edits it, not a request), so a short
// in-memory cache avoids a Postgres round trip on every single page render
// without risking a stale region surviving more than a minute after an edit.
const CACHE_TTL_MS = 60_000;
const byDomain = new Map<string, { region: Region | null; expiresAt: number }>();
const byId = new Map<number, { region: Region | null; expiresAt: number }>();

export async function getRegionByDomain(domain: string): Promise<Region | null> {
  const cached = byDomain.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.region;

  const [row] = await db.select().from(regions).where(eq(regions.domain, domain)).limit(1);
  const region = row ?? null;
  byDomain.set(domain, { region, expiresAt: Date.now() + CACHE_TTL_MS });
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
