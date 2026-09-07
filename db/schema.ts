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

// The metro area a venue/special/event belongs to. Everything today is
// "central-okanagan" (Kelowna, West Kelowna, Lake Country, Peachland) — this
// exists so a future region (Southern Okanagan, Lower Mainland, etc.) is a
// new value here, not a schema migration.
export const DEFAULT_REGION = "central-okanagan";

export const regions = specialsSchema.table("regions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // "kelowna", "south-okanagan"
  domain: text("domain").notNull().unique(), // "kelownafooddeals.shop"
  brandName: text("brand_name").notNull(), // "Kelowna Food Deals"
  logoUrl: text("logo_url").notNull(),
  accentColor: text("accent_color").notNull(),
  accentDimColor: text("accent_dim_color").notNull(),
  accentSoftColor: text("accent_soft_color").notNull(),
  backgroundColor: text("background_color").notNull(),
  foregroundColor: text("foreground_color").notNull(),
  evergreenColor: text("evergreen_color").notNull(),
  // CASL requires a valid mailing address in every commercial email sent from
  // this region -- see lib/outreach-email.ts and the OUTREACH_MAILING_ADDRESS
  // history this replaces.
  mailingAddress: text("mailing_address").notNull(),
  contactEmail: text("contact_email").notNull(),
  // This region's own nightly scrape budget, separate from every other
  // region's so a busy region can never starve a smaller one's share.
  tokenCeiling: integer("token_ceiling").notNull().default(50000),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Region = typeof regions.$inferSelect;

export const venues = specialsSchema.table(
  "venues",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    region: text("region").notNull().default(DEFAULT_REGION),
    regionId: integer("region_id").references(() => regions.id),
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
    // Paid featured placement: while now() < featuredUntil, this venue's card sorts
    // to the top of every day/category view. Null or past = not featured. A plain
    // timestamp rather than a boolean so a lapsed placement un-features itself with
    // no cron needed to flip it back off.
    featuredUntil: timestamp("featured_until", { withTimezone: true }),
    // Standing paid status, separate from the time-limited featuredUntil/boostedUntil
    // placements: the date they became a partner, or null. Doesn't expire on its own --
    // an admin clears it manually when a partnership ends. Shown as its own badge.
    partnerSince: timestamp("partner_since", { withTimezone: true }),
  },
  (table) => [uniqueIndex("venues_name_unique").on(table.name)]
);

export const outreachSendStatus = ["queued", "sent", "failed", "bounced", "replied"] as const;
export type OutreachSendStatus = (typeof outreachSendStatus)[number];

export const outreachSends = specialsSchema.table("outreach_sends", {
  id: serial("id").primaryKey(),
  // Null for a reply/auto-reply to a sender with no matching venue (e.g. a
  // sponsorship inquiry) -- still logged here so it shows up in that thread's
  // history in the admin inbox, same as a venue-matched reply does.
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
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
  region: text("region").notNull().default(DEFAULT_REGION),
  regionId: integer("region_id").references(() => regions.id),
  title: text("title").notNull(),
  description: text("description"),
  priceCents: integer("price_cents"),
  dayOfWeek: smallint("day_of_week"), // 0-6, null = daily
  isMonthly: boolean("is_monthly").notNull().default(false), // runs all month, ignores dayOfWeek/startTime/endTime
  // Only meaningful when isMonthly is true: the last calendar day this specific
  // month's version of the special is valid (e.g. a venue's rotating "menu of the
  // month" insert). Null means no known end date -- stays active until manually
  // archived or superseded, same as any other special. When set, the nightly cron
  // archives it automatically once past this date, so a month-limited special
  // doesn't need to be manually removed.
  monthlyThroughDate: date("monthly_through_date"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  category: text("category").$type<SpecialCategory>().notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull().default(1),
  extractionNotes: text("extraction_notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }), // set when superseded by a change; null = currently active
  // Paid seasonal boost: while now() < boostedUntil, this specific special sorts
  // first within its venue's card and gets a "Featured" badge. Same lapses-itself
  // design as venues.featuredUntil.
  boostedUntil: timestamp("boosted_until", { withTimezone: true }),
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
  region: text("region").notNull().default(DEFAULT_REGION), // set directly since venueId can be null (no venue to join through)
  regionId: integer("region_id").references(() => regions.id),
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
  // Null when the submitter's venue isn't in our list yet -- venueName/venueAddress
  // carry the free-text details instead, and an admin creates the real venue row
  // (see app/api/admin/submissions/[id]/route.ts) the first time an item is approved.
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
  venueName: text("venue_name"), // set only when venueId is null
  venueAddress: text("venue_address"), // set only when venueId is null
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

// One sponsor slot per specials category (e.g. "Wing Nights presented by X"). At most
// one row per category is meaningful at a time -- a new sponsorship replaces the old
// row rather than the app needing to pick among several. Null sponsorUntil = indefinite.
export const categorySponsors = specialsSchema.table("category_sponsors", {
  id: serial("id").primaryKey(),
  category: text("category").$type<SpecialCategory>().notNull(),
  sponsorName: text("sponsor_name").notNull(),
  sponsorUrl: text("sponsor_url"),
  sponsorUntil: timestamp("sponsor_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookingProductType = ["featured", "boost", "category_sponsor"] as const;
export type BookingProductType = (typeof bookingProductType)[number];

export const bookingStatus = [
  "pending_payment",
  "pending_approval",
  "approved",
  "rejected",
  "expired",
] as const;
export type BookingStatus = (typeof bookingStatus)[number];

// A self-serve paid placement, from the moment a buyer starts checkout through admin
// approval. This is the source of truth for scheduling; venues.featuredUntil,
// specials.boostedUntil, and categorySponsors stay the "what's live right now" cache
// that all existing render code already reads -- activateBooking() (lib/bookings-data.ts)
// is the only thing that writes into those from an approved booking.
export const bookings = specialsSchema.table("bookings", {
  id: serial("id").primaryKey(),
  productType: text("product_type").$type<BookingProductType>().notNull(),
  // Set for every product ("featured"/"category_sponsor": the sponsoring venue itself;
  // "boost": the venue that owns specialId).
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
  specialId: integer("special_id").references(() => specials.id, { onDelete: "cascade" }), // "boost" only
  category: text("category").$type<SpecialCategory>(), // "category_sponsor" only
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").$type<BookingStatus>().notNull().default("pending_payment"),
  // Only meaningful while status = "pending_payment" -- the checkout hold's expiry.
  // A row past this point simply stops counting toward capacity (see
  // lib/booking-availability.ts); nothing needs to actively clean it up.
  reservedUntil: timestamp("reserved_until", { withTimezone: true }),
  priceCents: integer("price_cents").notNull(), // snapshot of what was actually charged
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  buyerEmail: text("buyer_email").notNull(),
  buyerVerifiedAt: timestamp("buyer_verified_at", { withTimezone: true }),
  refundNeeded: boolean("refund_needed").notNull().default(false),
  // Set by the Stripe webhook if payment succeeded but the dates now conflict with an
  // approved booking made in the interim -- surfaced for manual admin resolution.
  conflictDetected: boolean("conflict_detected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

// Admin-configurable caps/pricing per product. Seeded with placeholder values below --
// the operator sets real numbers before this goes live.
export const monetizationSettings = specialsSchema.table("monetization_settings", {
  productType: text("product_type").$type<BookingProductType>().primaryKey(),
  regionId: integer("region_id").references(() => regions.id),
  capCount: integer("cap_count"), // null = uncapped
  priceCentsPerDay: integer("price_cents_per_day").notNull(),
  minDays: integer("min_days").notNull(),
  maxDays: integer("max_days").notNull(),
});
