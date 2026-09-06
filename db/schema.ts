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
    // The town this venue is actually in (Kelowna, West Kelowna, Lake Country,
    // Peachland). Nullable so venues seeded before this column existed keep
    // working; consumers fall back to "Kelowna" when it's null.
    city: text("city"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone"),
    website: text("website"),
    menuUrl: text("menu_url"),
    instagramHandle: text("instagram_handle"),
    contactEmail: text("contact_email"),
    sourceUrls: text("source_urls").array().notNull().default([]),
    active: boolean("active").notNull().default(true),
    // Some venue sites (e.g. O'Flannigan's) load their specials/events board
    // via client-side JS, invisible to a plain HTTP fetch. Set true once
    // that's confirmed so the cron uses a headless-browser fetch for this
    // venue instead of wasting a plain-fetch attempt every night.
    requiresBrowser: boolean("requires_browser").notNull().default(false),
    // Set when a venue unsubscribes from outreach email via the link in that email.
    // Checked before every outreach send so a "stop" is honored, not just noted.
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("venues_name_unique").on(table.name)]
);

export const outreachSendStatus = ["queued", "sent", "failed", "bounced", "replied"] as const;
export type OutreachSendStatus = (typeof outreachSendStatus)[number];

export const outreachSends = specialsSchema.table("outreach_sends", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  status: text("status").$type<OutreachSendStatus>().notNull().default("queued"),
  brevoMessageId: text("brevo_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inboundEmails = specialsSchema.table("inbound_emails", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }), // matched by from-email, nullable if no match
  brevoMessageId: text("brevo_message_id"),
  inReplyTo: text("in_reply_to"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  subject: text("subject"),
  textBody: text("text_body"),
  htmlBody: text("html_body"),
  read: boolean("read").notNull().default(false),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
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
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }), // null for events at a place not in our venues table (e.g. a winery hosting a concert)
  locationName: text("location_name"), // used when venueId is null
  locationAddress: text("location_address"), // used when venueId is null
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
  submissionType: text("submission_type").$type<SubmissionType>(), // legacy, unused now that a submission can yield mixed item types
  rawText: text("raw_text"),
  photoData: text("photo_data"), // base64-encoded image, size-capped at the API layer
  photoMimeType: text("photo_mime_type"),
  status: text("status").$type<SubmissionStatus>().notNull().default("needs_review"),
  aiExtracted: jsonb("ai_extracted"), // { specials: [...], events: [...], menuItems: [...] } proposed by the AI
  aiConfidence: real("ai_confidence"),
  aiNotes: text("ai_notes"),
  resultingRowId: integer("resulting_row_id"), // legacy, unused now that a submission can yield multiple rows
  resolvedItemKeys: text("resolved_item_keys")
    .array()
    .notNull()
    .default([]), // e.g. "special:0", "event:1" — items already approved/rejected by an admin
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const menuItems = specialsSchema.table("menu_items", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents"), // regular menu price, not a deal — null if not stated
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull().default(1),
  extractionNotes: text("extraction_notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const venuePhotos = specialsSchema.table(
  "venue_photos",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    photoData: text("photo_data").notNull(), // base64-encoded image
    photoMimeType: text("photo_mime_type").notNull(),
    caption: text("caption"),
    submissionId: integer("submission_id").references(() => submissions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Postgres allows multiple NULLs through a unique index, so this only enforces
  // "at most one photo per submission" -- it doesn't affect rows with no submissionId.
  (table) => [uniqueIndex("venue_photos_submission_id_unique").on(table.submissionId)]
);

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

export const analyticsEvents = specialsSchema.table("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // "pageview" | "cta_click" | "submission" | "tip" | ...
  eventLabel: text("event_label"), // e.g. venue id/name, button name
  page: text("page").notNull(),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  referrer: text("referrer"),
  country: text("country"), // from Cloudflare's CF-IPCountry header
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Fixed-window per-IP rate limiting for public write endpoints (submit, report) and the
// admin login attempt counter. windowStart is truncated to the window size (e.g. the top
// of the hour) so a single row can be atomically incremented via ON CONFLICT.
export const rateLimits = specialsSchema.table(
  "rate_limits",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(), // e.g. "submit:1.2.3.4" or "login:1.2.3.4"
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [uniqueIndex("rate_limits_key_window_unique").on(table.key, table.windowStart)]
);
