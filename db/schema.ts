import {
  pgSchema,
  serial,
  text,
  boolean,
  integer,
  smallint,
  time,
  timestamp,
  real,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const specialsSchema = pgSchema("specials");

export const venues = specialsSchema.table("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  phone: text("phone"),
  website: text("website"),
  menuUrl: text("menu_url"),
  instagramHandle: text("instagram_handle"),
  sourceUrls: text("source_urls").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
});

export const specialCategory = [
  "happy_hour",
  "food_special",
  "wing_night",
  "other",
] as const;
export type SpecialCategory = (typeof specialCategory)[number];

export const specials = specialsSchema.table("specials", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priceCents: integer("price_cents"),
  dayOfWeek: smallint("day_of_week"), // 0-6, null = daily
  startTime: time("start_time"),
  endTime: time("end_time"),
  category: text("category").$type<SpecialCategory>().notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull().default(1),
  extractionNotes: text("extraction_notes"),
});

export const scrapeRuns = specialsSchema.table("scrape_runs", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  contentHash: text("content_hash"),
  changed: boolean("changed").notNull(),
  tokensUsed: integer("tokens_used").notNull().default(0),
  error: text("error"),
});
