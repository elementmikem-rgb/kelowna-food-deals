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
  date,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export const specialsSchema = pgSchema("specials");

export const venues = specialsSchema.table(
  "venues",
  {
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
  },
  (table) => [uniqueIndex("venues_name_unique").on(table.name)]
);

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
  isMonthly: boolean("is_monthly").notNull().default(false), // runs all month, ignores dayOfWeek/startTime/endTime
  startTime: time("start_time"),
  endTime: time("end_time"),
  category: text("category").$type<SpecialCategory>().notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull().default(1),
  extractionNotes: text("extraction_notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }), // set when superseded by a change; null = currently active
});

export const eventType = [
  "live_music",
  "trivia",
  "karaoke",
  "sports_night",
  "other",
] as const;
export type EventType = (typeof eventType)[number];

export const events = specialsSchema.table("events", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // e.g. act/performer name or event name
  description: text("description"),
  eventType: text("event_type").$type<EventType>().notNull(),
  dayOfWeek: smallint("day_of_week"), // recurring weekly event; null if one-off
  specificDate: date("specific_date"), // one-off event on this exact date; null if recurring
  startTime: time("start_time"),
  endTime: time("end_time"),
  coverChargeCents: integer("cover_charge_cents"), // null = free / not stated
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull().default(1),
  extractionNotes: text("extraction_notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const submissionType = ["special", "event"] as const;
export type SubmissionType = (typeof submissionType)[number];

export const submissionStatus = [
  "auto_approved",
  "needs_review",
  "approved",
  "rejected",
] as const;
export type SubmissionStatus = (typeof submissionStatus)[number];

export const submissions = specialsSchema.table("submissions", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  submissionType: text("submission_type").$type<SubmissionType>().notNull(),
  rawText: text("raw_text"),
  photoData: text("photo_data"), // base64-encoded image, size-capped at the API layer
  photoMimeType: text("photo_mime_type"),
  status: text("status").$type<SubmissionStatus>().notNull().default("needs_review"),
  aiExtracted: jsonb("ai_extracted"), // structured special/event fields the AI proposed
  aiConfidence: real("ai_confidence"),
  aiNotes: text("ai_notes"),
  resultingRowId: integer("resulting_row_id"), // id in specials/events once approved
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
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
