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

export const countries = specialsSchema.table("countries", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // "CA", "US" (ISO 3166-1 alpha-2)
  name: text("name").notNull(), // "Canada"
  currency: text("currency").notNull(), // "CAD" (ISO 4217) -- stored for future use, nothing reads it yet
  // CASL-style default a region can inherit -- nullable because every region already
  // has to set its own real mailing address today (a hard multi-region-spec
  // requirement independent of this hierarchy), so a country-level default is a
  // convenience, not a requirement.
  mailingAddress: text("mailing_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Country = typeof countries.$inferSelect;

export const provinces = specialsSchema.table(
  "provinces",
  {
    id: serial("id").primaryKey(),
    countryId: integer("country_id")
      .notNull()
      .references(() => countries.id),
    code: text("code").notNull(), // "BC", "AB", "WA"
    name: text("name").notNull(), // "British Columbia"
    // A country can span multiple timezones (BC is Pacific, Ontario is Eastern) --
    // province is the level where timezone is actually a stable, well-defined fact.
    // No region-level override: no real case has needed a city to differ from its
    // own province's timezone.
    timezone: text("timezone").notNull(), // IANA name, e.g. "America/Vancouver"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("provinces_country_code_idx").on(table.countryId, table.code)]
);
export type Province = typeof provinces.$inferSelect;

export const regions = specialsSchema.table("regions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // "kelowna", "south-okanagan"
  // Nullable: only the two legacy regions (Kelowna, Penticton) have one -- their
  // old per-region domains still 301-redirect into the consolidated
  // todaystab.com/{slug} path (see proxy.ts). A region added after that
  // migration lives entirely under todaystab.com/{slug} and needs no domain
  // of its own at all.
  domain: text("domain").unique(),
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
  // Drives every user-facing string on this region's pages (see lib/i18n.ts) --
  // "en" for every region so far, "fr" for Quebec. Not a user-switchable
  // preference: a region's language is fixed at launch, since the audience for
  // todaystab.com/quebec-city is francophone regardless of who's viewing it.
  language: text("language").notNull().default("en"),
  // This region's own nightly scrape budget, separate from every other
  // region's so a busy region can never starve a smaller one's share.
  tokenCeiling: integer("token_ceiling").notNull().default(50000),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
  // The region's own town/city center, NOT a per-venue location -- geocoded
  // once from the region's own name+province (see scripts/geocode-regions.ts).
  // Good enough for "which region is closest to you" (CityFinder's "Use my
  // location"); a real per-venue lat/lng (venues.lat/lng, currently 0%
  // populated) would give a more precise "nearest venue" answer, but that's
  // a much bigger backfill -- backlogged separately, not needed for this.
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
});
export type Region = typeof regions.$inferSelect;

// Groups same-brand venue rows (Boston Pizza, Earls, etc.) purely for the admin claims
// queue's "this chain has N other claimed locations" suggestion -- see the moat-layer-3
// plan. Deliberately NOT a source of automatic trust: claiming one location never grants
// access to another just because they share a chainId, since real chains are very often
// independently franchised per location. Seeded by a one-time script, not a migration --
// adding a new chain later is a data change, not a deploy.
export const venueChains = specialsSchema.table("venue_chains", {
  id: serial("id").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const venues = specialsSchema.table(
  "venues",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id),
    chainId: integer("chain_id").references(() => venueChains.id),
    // The town this venue is actually in (Kelowna, West Kelowna, Lake Country,
    // Peachland). Nullable so venues seeded before this column existed keep
    // working; consumers fall back to "Kelowna" when it's null.
    city: text("city"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    // True when lat/lng is the PARENT REGION's center point, not this venue's
    // own geocoded location -- set for the ~346 venues (2026-09-23 backfill)
    // whose address was too vague/landmark-based for Nominatim to resolve
    // (e.g. "downtown Oliver, BC", "Near Jasper Ave & Rogers Place"). False
    // for every venue with a real geocoded address, including new ones seeded
    // going forward. These should get re-geocoded with a better source
    // (Google/Mapbox, or a manually-corrected address) eventually -- query
    // `where approxCoords = true` to find them, don't assume every venue's
    // coordinates are precise.
    approxCoords: boolean("approx_coords").notNull().default(false),
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
    // Paid map pin boost: while now() < mapPinBoostedUntil, this venue's pin on the
    // /[region]/map view renders larger/highlighted and sorts above regular pins in a
    // cluster. Independent of featuredUntil -- a venue can pay for either, both, or
    // neither; the map is a separate surface from the list view. Same "timestamp, not
    // boolean" self-expiring pattern as featuredUntil.
    mapPinBoostedUntil: timestamp("map_pin_boosted_until", { withTimezone: true }),
    // Standing paid status, separate from the time-limited featuredUntil/boostedUntil
    // placements: the date they became a partner, or null. Doesn't expire on its own --
    // an admin clears it manually when a partnership ends. Shown as its own badge.
    partnerSince: timestamp("partner_since", { withTimezone: true }),
    // Set by a human (admin scrape-health panel) after manually confirming a
    // zero-listing venue genuinely has nothing promotional to find -- not just
    // "couldn't access" (a Facebook login wall, a site with no website on file
    // at all). Lets /admin/scrape-health's zero-listing report stop resurfacing
    // the same already-checked venue every time; excluded only for
    // ZERO_LISTING_RECHECK_DAYS (see lib/scrape-health.ts) so a venue whose site
    // later grows a specials page still gets rechecked eventually.
    checkedNoListingsAt: timestamp("checked_no_listings_at", { withTimezone: true }),
    checkedNoListingsNote: text("checked_no_listings_note"),
    // Set the moment an admin approves a claim request (app/api/admin/claims/[id]/route.ts).
    // Drives two things: the nightly cron skips this venue entirely (cron/index.ts) since the
    // owner is now the source of truth, and the "Owner verified" badge on its cards.
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    // Cached sum of creditLedger.delta for this venue -- read on every checkout/dashboard
    // load, so a cache avoids re-summing the ledger every time. The ledger stays the
    // source of truth/audit trail; every write to this column happens in the same
    // transaction as the matching ledger insert (see lib/credits.ts), so the two can
    // never drift. Units: whole dollar-credits (1 credit = $1, see lib/credits.ts).
    creditBalance: integer("credit_balance").notNull().default(0),
  },
  (table) => [uniqueIndex("venues_name_unique").on(table.name)]
);

// A visitor's request to take ownership of a venue's listing -- manually reviewed by an
// admin (app/admin/claims) before any access is granted, same "a person checks every
// submission" posture as the visitor-submission queue. Approving one creates the matching
// venueOwners row and sets venues.claimedAt.
export const venueClaimRequestStatus = ["pending", "approved", "rejected"] as const;
export type VenueClaimRequestStatus = (typeof venueClaimRequestStatus)[number];

export const venueClaimRequests = specialsSchema.table("venue_claim_requests", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role"), // e.g. "owner", "manager" -- free text, not enforced
  message: text("message"),
  status: text("status").$type<VenueClaimRequestStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  // Only set on reject -- lets an admin note why (e.g. "no specials to publish yet")
  // instead of the claimant just seeing silence, and gives us a record to check before
  // reaching back out later. Never set on approve.
  rejectionReason: text("rejection_reason"),
});

// A pure owner identity -- the actual account a venueOwnerSessions token resolves to.
// Deliberately holds no venueId of its own (see venueOwnerVenues below): one owner can
// manage several venues (moat layer 3), so venue linkage lives in its own join table
// instead of being baked into the identity row itself.
export const venueOwners = specialsSchema.table("venue_owners", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  // Separate from venues.unsubscribedAt, which gates cold outreach email -- an owner
  // who already claimed their listing opting out of the weekly stats digest shouldn't
  // silently also suppress a different email stream they never asked to stop.
  weeklyDigestOptOut: boolean("weekly_digest_opt_out").notNull().default(false),
  // Null until the owner sets one from the dashboard -- magic-link login (above) always
  // keeps working even after a password is set, this is an alongside option, not a
  // replacement. Format: "<hex salt>:<hex scrypt hash>", see lib/owner-password.ts.
  passwordHash: text("password_hash"),
  passwordSetAt: timestamp("password_set_at", { withTimezone: true }),
  // Lazily created on first visit to billing (Stripe Customer Portal or checkout), not
  // at account/claim time -- an owner who never touches billing shouldn't have a Stripe
  // object created on their behalf with nothing to manage.
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Null until the owner dismisses the first-login welcome banner (the dashboard's
  // OwnerOnboarding component) -- shown once per owner account, not once per venue, so
  // an owner with multiple claimed venues doesn't see it again switching between them.
  onboardingSeenAt: timestamp("onboarding_seen_at", { withTimezone: true }),
});

// One row per venue an owner account manages. A venue still has at most one owner (the
// unique index on venueId is unchanged in spirit from the old venueOwners constraint),
// but an owner can now have many venues -- linked either by an automatic email/phone
// match or an admin's manual "link to existing owner" choice at claim-approval time
// (app/api/admin/claims/[id]/route.ts), never automatically from sharing a chainId.
export const venueOwnerVenues = specialsSchema.table(
  "venue_owner_venues",
  {
    id: serial("id").primaryKey(),
    venueOwnerId: integer("venue_owner_id")
      .notNull()
      .references(() => venueOwners.id, { onDelete: "cascade" }),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("venue_owner_venues_venue_id_unique").on(table.venueId)]
);

// Magic-link session for an owner -- deliberately a DB-backed token lookup, not a stateless
// signed cookie like lib/admin-auth.ts's HMAC approach: owner pages are plain Next.js
// routes, not Edge middleware (proxy.ts), so there's no need for Edge-compatible Web Crypto,
// and a DB lookup makes revoking a session (e.g. a claim getting disputed) a single delete.
export const venueOwnerSessions = specialsSchema.table(
  "venue_owner_sessions",
  {
    id: serial("id").primaryKey(),
    venueOwnerId: integer("venue_owner_id")
      .notNull()
      .references(() => venueOwners.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("venue_owner_sessions_token_unique").on(table.token)]
);

export const outreachSendStatus = ["queued", "sent", "failed", "bounced", "replied"] as const;
export type OutreachSendStatus = (typeof outreachSendStatus)[number];

export const outreachSends = specialsSchema.table("outreach_sends", {
  id: serial("id").primaryKey(),
  // Null for a reply/auto-reply to a sender with no matching venue (e.g. a
  // sponsorship inquiry) -- still logged here so it shows up in that thread's
  // history in the admin inbox, same as a venue-matched reply does.
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
  // "first_contact" (the original free-listing email), "follow_up" (claim-flow/
  // credit-system campaign), or "weekend_promo" (lib/outreach-weekend-email.ts,
  // 2026-10-02 -- goes to everyone eligible regardless of prior outreach kind).
  // Default keeps every pre-existing row correctly labeled without a backfill.
  // app/api/admin/outreach/send/route.ts's "already sent" guard checks this
  // kind specifically, so one campaign's send doesn't get silently blocked by
  // (or silently re-trigger a duplicate of) a different kind's send.
  kind: text("kind").$type<"first_contact" | "follow_up" | "weekend_promo">().notNull().default("first_contact"),
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
  // Set by the admin inbox's "Delete" action. Hidden, not deleted -- the row
  // must survive so app/api/admin/outreach/send/route.ts's "already sent"
  // guard still sees it (a hard delete here would silently re-open the venue
  // for a second cold outreach email) and so /admin/outreach's send history
  // stays intact.
  hiddenFromInbox: boolean("hidden_from_inbox").notNull().default(false),
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
  archivedAt: timestamp("archived_at", { withTimezone: true }), // null = active/inbox
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
  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id),
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
  // True only when an admin archived this via the flagged-review queue (a human
  // judgment call, e.g. the venue told us directly it's wrong/discontinued) --
  // false for every other archival (cron superseding it with a changed version,
  // monthly expiry). cron/upsert.ts's replaceVenueSpecials treats a manually
  // archived row as a standing "don't re-add this" decision: if a future scrape
  // extracts content matching its identity, it stays archived instead of being
  // silently reinserted as a new active row.
  archivedManually: boolean("archived_manually").notNull().default(false),
  // Paid seasonal boost: while now() < boostedUntil, this specific special sorts
  // first within its venue's card and gets a "Featured" badge. Same lapses-itself
  // design as venues.featuredUntil.
  boostedUntil: timestamp("boosted_until", { withTimezone: true }),
  // Separate paid add-on from boostedUntil above -- a venue can buy one, the other,
  // both, or neither. While now() < chatBoostedUntil, this item is guaranteed to survive
  // the Ask chat's context caps and gets a "(Promoted)" mention when genuinely relevant
  // to a visitor's question (see lib/region-chat.ts). Never affects the public board.
  chatBoostedUntil: timestamp("chat_boosted_until", { withTimezone: true }),
  // Set when the venue itself clicks "Yes, this is accurate" on the /verify/[token]
  // page reached from the outreach email -- see lib/venue-verify.ts. Null means never
  // confirmed by the venue. Survives unchanged across cron re-scrapes (the nightly
  // upsert only creates a new row when a special's content actually changes -- see
  // cron/upsert.ts's replaceVenueSpecials), so a confirmation naturally resets to null
  // only when the underlying deal itself changes, matching the spec's "no expiry" rule.
  venueConfirmedAt: timestamp("venue_confirmed_at", { withTimezone: true }),
  // Paid photo add-on to a Boost purchase (see bookings.hasPhotoAddOn) -- only ever
  // rendered on the card while boostedUntil is still active (see isPromotionActive), so
  // the photo naturally stops showing whenever the boost itself lapses without needing
  // its own separate expiry tracking. Base64-encoded, same storage pattern as
  // venuePhotos.photoData.
  photoData: text("photo_data"),
  photoMimeType: text("photo_mime_type"),
  // Flash special: a venue-posted, time-limited urgent deal ("first 20 people get a
  // free beer, next 2 hours") -- posted free from the owner dashboard (OwnerDashboard.tsx
  // / app/api/owner/flash-special/route.ts), not a paid booking product.
  // Non-null flashExpiresAt IS the flag (no separate boolean) -- once past, the row is
  // just a normal expired special and the display/query layers stop treating it as
  // flash automatically rather than needing a second field to also flip.
  flashExpiresAt: timestamp("flash_expires_at", { withTimezone: true }),
  // Null = unlimited claims, just a time limit. Set = "first N people" -- the owner's
  // own read of demand at post time, not something this app tracks fulfillment of (no
  // POS integration); flashClaimCount is a visitor-side "I'm claiming this" tap count,
  // purely informational (creates urgency: "14 of 20 claimed"), never enforced as a hard
  // cutoff since there's no way to verify a claim actually happened at the bar.
  flashClaimLimit: integer("flash_claim_limit"),
  flashClaimCount: integer("flash_claim_count").notNull().default(0),
});

export const eventType = [
  "live_music",
  "trivia",
  "karaoke",
  "sports_night",
  "other",
] as const;
export type EventType = (typeof eventType)[number];

// Mirrored as a local literal type in lib/time.ts (same reasoning as that file's
// other duplicated-not-imported enums) so client components resolving a monthly
// date never pull this server module's drizzle/postgres dependencies.
export const monthlyOccurrence = ["1st", "2nd", "3rd", "4th", "last"] as const;
export type MonthlyOccurrence = (typeof monthlyOccurrence)[number];

export const events = specialsSchema.table("events", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }), // null for events at a place not in our venues table (e.g. a winery hosting a concert)
  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id), // set directly since venueId can be null (no venue to join through)
  locationName: text("location_name"), // used when venueId is null
  locationAddress: text("location_address"), // used when venueId is null
  title: text("title").notNull(), // e.g. act/performer name or event name
  description: text("description"),
  eventType: text("event_type").$type<EventType>().notNull(),
  dayOfWeek: smallint("day_of_week"), // recurring weekly event; null if one-off
  specificDate: date("specific_date"), // one-off event on this exact date; null if recurring
  // Only meaningful alongside a non-null dayOfWeek -- narrows "every Wednesday" down
  // to a single week of the month (e.g. a venue's "Open Mic, last Saturday of the
  // month" night). Null means the plain weekly case: every occurrence of dayOfWeek.
  // There's no column for "every 2nd and 4th Tuesday"-style multi-week patterns --
  // that's rare enough to handle as two separate rows if it ever comes up, same as
  // a special that runs on multiple non-adjacent days already gets split.
  monthlyOccurrence: text("monthly_occurrence").$type<MonthlyOccurrence>(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  coverChargeCents: integer("cover_charge_cents"), // null = free / not stated
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull().default(1),
  extractionNotes: text("extraction_notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  // See specials.archivedManually -- same meaning, same cron.upsert.ts contract,
  // for events.
  archivedManually: boolean("archived_manually").notNull().default(false),
  // Paid "boost" placement -- same meaning and same lapses-itself design as
  // specials.boostedUntil. Only ever set for a venue-owned event (bookings.eventId
  // requires a non-null venues.id to resolve a region for capacity scoping -- see
  // booking-availability.ts), never for a non-venue event.
  boostedUntil: timestamp("boosted_until", { withTimezone: true }),
  // See specials.chatBoostedUntil -- same separate, independent Ask-chat-only add-on.
  chatBoostedUntil: timestamp("chat_boosted_until", { withTimezone: true }),
  // See specials.photoData -- same paid photo/poster add-on, same "only shown while
  // boosted" rule. For an event this is typically the venue's own poster graphic.
  photoData: text("photo_data"),
  photoMimeType: text("photo_mime_type"),
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
  // Null on rows predating this column -- approval falls back to getPrimaryRegion() for those.
  // Set from the region-aware /submit page for every new submission going forward, so a
  // new-venue-from-submission is assigned to the region the submitter actually used.
  regionId: integer("region_id").references(() => regions.id),
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
  // Total of every usage field below (uncached input + cache writes + cache reads +
  // output) -- kept for the existing "avg tokens per venue" volume stat. Use the three
  // columns below instead when computing an actual dollar cost, since input/output/cache
  // tokens are priced very differently (see lib/anthropic-pricing.ts).
  tokensUsed: integer("tokens_used").notNull().default(0),
  // Populated once the extraction/vision call started using prompt caching (2026-09-16).
  // Null on every row from before that -- those rows' `tokensUsed` is all regular input +
  // output with no cache component, so treat null here as 0 for cost math, not "unknown".
  cacheCreationTokens: integer("cache_creation_tokens"),
  cacheReadTokens: integer("cache_read_tokens"),
  outputTokens: integer("output_tokens"),
  error: text("error"),
});

// A venue's promo image (flyer, happy-hour graphic) rarely changes night to
// night, but transcribeImageText() in cron/vision.ts previously re-ran the
// vision API call on every fetch regardless -- unlike HTML-text extraction,
// which already skips re-extraction via scrapeRuns.contentHash. Keyed on the
// image's own URL (stable per venue) with a hash of the downloaded bytes, so
// a fetch that finds the same URL AND the same bytes can reuse the stored
// transcription instead of paying for another vision call.
export const imageTranscriptions = specialsSchema.table(
  "image_transcriptions",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    contentHash: text("content_hash").notNull(),
    transcribedText: text("transcribed_text").notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("image_transcriptions_image_url_unique").on(table.imageUrl)]
);

// One row per Anthropic Message Batch submitted for a region's changed venues -- the
// Batch API is async (submit now, results arrive later, possibly on a subsequent cron
// run), so this is what lets one cron invocation pick back up a batch a previous
// invocation submitted but that hadn't finished processing yet.
export const extractionBatches = specialsSchema.table("extraction_batches", {
  id: serial("id").primaryKey(),
  anthropicBatchId: text("anthropic_batch_id").notNull(),
  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id, { onDelete: "cascade" }),
  // "pending" (submitted, not yet resolved) | "applied" (results fetched and written to
  // specials/events/menu_items) | "failed" (batch itself errored/expired/canceled, or
  // every item in it failed) -- never "in_progress" here, since that's Anthropic's own
  // batch status and this row doesn't need to track it separately between poll attempts.
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// One row per venue submitted inside an extractionBatches row -- carries everything
// applying that venue's result needs (the content hash to record, the fetch-phase token
// spend to add to the final tokensUsed, whether menu items were asked for) so applying a
// batch's results doesn't need to re-fetch or re-derive any of it.
export const extractionBatchItems = specialsSchema.table("extraction_batch_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id")
    .notNull()
    .references(() => extractionBatches.id, { onDelete: "cascade" }),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id, { onDelete: "cascade" }),
  customId: text("custom_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  contentHash: text("content_hash").notNull(),
  includeMenuItems: boolean("include_menu_items").notNull(),
  fetchTokens: integer("fetch_tokens").notNull().default(0),
  // The whitespace-collapsed, lowercased page text this venue's request was built from
  // (see truncatePageText in cron/extract.ts) -- applying the batch's results needs this
  // to run the same evidence_quote verbatim-match check the sync path runs inline, and a
  // batch can resolve on a LATER cron run than the one that submitted it, so the original
  // page text has to be persisted rather than re-fetched (the venue's page may have
  // changed again by then, which would make re-fetching verify against the wrong text).
  pageTextHaystack: text("page_text_haystack").notNull(),
  // "pending" (batch not yet resolved) | "applied" | "failed" (this item's own result
  // errored/expired/malformed -- the rest of the batch can still apply successfully).
  status: text("status").notNull().default("pending"),
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
  // Kept purely for after-the-fact forensics -- e.g. a scattered-geography,
  // no-referrer, one-pageview-per-session burst (a classic domain-scanner
  // signature) previously couldn't be confirmed as bot traffic at all, since
  // the UA used to pass isBotUserAgent() was discarded right after the check.
  userAgent: text("user_agent"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Nullable: rows recorded before this column existed have no way to know
  // their region after the fact, and stay null forever rather than being
  // backfilled with a guess (same pattern as monetizationSettings.regionId).
  regionId: integer("region_id").references(() => regions.id),
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

// One row per visitor confirm/dispute click on a special or event. Counts are computed
// at read time (count(*) grouped by itemId/kind/feedbackType) rather than stored as a
// running total, so there's no risk of a cached count drifting from the underlying rows.
// itemId + kind together identify the target row (specials.id or events.id) -- mirrors
// the same kind-discriminated design app/api/report/route.ts already uses, rather than
// adding two separate nullable foreign key columns.
export const dealFeedbackReason = ["price_wrong", "not_offered", "wrong_day_time", "other"] as const;
export type DealFeedbackReason = (typeof dealFeedbackReason)[number];

export const dealFeedback = specialsSchema.table("deal_feedback", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  kind: text("kind").$type<"special" | "event">().notNull(),
  // "interested" (events only, Eventbrite-style social proof -- see
  // components/EventInterestButton.tsx) is a plain text value like the other two, not
  // a Postgres enum, so adding it needed no migration -- just this TS type widening.
  feedbackType: text("feedback_type").$type<"confirm" | "dispute" | "interested">().notNull(),
  // Only ever set on a "dispute" row -- a visitor's pick from ReportDialog's preset
  // reasons. Null for confirm/interested rows, and for disputes logged before this
  // column existed (kept nullable rather than backfilled so old rows just render with
  // no reason shown instead of a fabricated guess).
  reason: text("reason").$type<DealFeedbackReason>(),
  // Free-text elaboration, optional even when reason is "other" -- a visitor who just
  // wants to flag something wrong without typing shouldn't be blocked from submitting.
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type DealFeedback = typeof dealFeedback.$inferSelect;

// A visitor's Web Push subscription (components/PushOptIn.tsx / lib/push-send.ts).
// Scoped to a region rather than a lat/lng radius -- a true geofence would need a second
// browser permission (Geolocation) on top of Notifications, and this site is already
// region-partitioned by domain (see lib/regions.ts), so "subscribed while browsing
// Kelowna" is a reasonable, lower-friction proxy for "near Kelowna" without asking twice.
// endpoint is the natural unique key (one row per browser+origin subscription, not per
// visitor -- there's no visitor account system to key on, same reasoning as
// lib/saved-venues.ts).
export const pushSubscriptions = specialsSchema.table(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint)]
);
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

// "category_sponsor" bookings/sponsors can sponsor either a specials category
// (happy_hour/food_special/wing_night/other) or an event type
// (live_music/trivia/karaoke/sports_night/other) -- both enums share the literal
// "other", so a bare category string alone can't tell which domain it belongs to.
// This discriminator disambiguates it everywhere the category is stored or booked.
export const sponsorCategoryKind = ["special", "event"] as const;
export type SponsorCategoryKind = (typeof sponsorCategoryKind)[number];

// One sponsor slot per (region, kind, category) triple (e.g. "Wing Nights presented by
// X" in Kelowna, independently of any other region's Wing Nights sponsor). At most one
// row per (regionId, kind, category) is meaningful at a time -- a new sponsorship
// replaces the old row for that region rather than the app needing to pick among
// several. Null sponsorUntil = indefinite. regionId exists (rather than this being a
// single global row per category) because booking-availability.ts's capacity check is
// per-region -- without a region column here, two different regions independently
// selling out their own "1 sponsor per category" cap would still collide into a single
// shared row, and activating the second would silently clobber the first's sponsor.
export const categorySponsors = specialsSchema.table("category_sponsors", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id),
  kind: text("kind").$type<SponsorCategoryKind>().notNull().default("special"),
  category: text("category").$type<SpecialCategory | EventType>().notNull(),
  sponsorName: text("sponsor_name").notNull(),
  sponsorUrl: text("sponsor_url"),
  sponsorUntil: timestamp("sponsor_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Flat-price, one-owner-per-(region, term) sponsorship for the Ask chat specifically --
// a third, distinct mechanism from specials.boostedUntil (public board "Featured") and
// specials/events.chatBoostedUntil (promotes one specific special/event). This promotes
// a venue whenever a visitor's question matches the purchased term (e.g. "beer",
// "trivia"), regardless of which specific item answers it -- see lib/region-chat.ts.
// `term` is free text, not a rigid enum, matched by the chat's own relevance judgment the
// same way item-level Promoted tags already are -- "beer" isn't a SpecialCategory value.
// priceCentsPerDay is a snapshot of what was actually charged (same convention as
// bookings.priceCents), typed by an admin at time of sale, never defaulted by code.
export const chatTermSponsors = specialsSchema.table("chat_term_sponsors", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id),
  term: text("term").notNull(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  priceCentsPerDay: integer("price_cents_per_day").notNull(),
  // Snapshot of the full amount charged for this sale (priceCentsPerDay * days at the
  // time it was sold) -- lets revenue reporting sum a real dollar figure without
  // re-deriving it from a rate and two timestamps, and survives independently of
  // whatever the flat rate later changes to.
  totalPriceCents: integer("total_price_cents").notNull(),
  until: timestamp("until", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookingProductType = ["featured", "boost", "category_sponsor", "chat_term_sponsor", "map_pin"] as const;
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
// specials.boostedUntil, events.boostedUntil, and categorySponsors stay the "what's
// live right now" cache that all existing render code already reads --
// activateBooking() (lib/bookings-data.ts) is the only thing that writes into those
// from an approved booking.
export const bookings = specialsSchema.table("bookings", {
  id: serial("id").primaryKey(),
  productType: text("product_type").$type<BookingProductType>().notNull(),
  // Set for every product ("featured"/"category_sponsor": the sponsoring venue itself;
  // "boost": the venue that owns specialId or eventId).
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
  specialId: integer("special_id").references(() => specials.id, { onDelete: "cascade" }), // "boost" only, mutually exclusive with eventId
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }), // "boost" only, mutually exclusive with specialId
  category: text("category").$type<SpecialCategory | EventType>(), // "category_sponsor" only
  categoryKind: text("category_kind").$type<SponsorCategoryKind>(), // "category_sponsor" only -- disambiguates category, see sponsorCategoryKind
  // "chat_term_sponsor" only -- free text (not an enum, matched by the Ask chat's own
  // relevance judgment, same as chatTermSponsors.term). This is that product's
  // equivalent of category+categoryKind's scoping key.
  chatTerm: text("chat_term"),
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
  // Set only for a subscription-mode checkout (owner-dashboard cart auto-renew items).
  // Several bookings can share one subscription id, the same way several can share one
  // stripeSessionId above -- one Stripe subscription can bundle multiple monthly
  // line items. The webhook extends endDate by 30 days on each "subscription_cycle"
  // invoice for a booking that's still approved; it never re-enters pending_approval,
  // only the very first period (via checkout.session.completed, same as a one-time
  // booking) needs a human look.
  stripeSubscriptionId: text("stripe_subscription_id"),
  autoRenew: boolean("auto_renew").notNull().default(false),
  buyerEmail: text("buyer_email").notNull(),
  buyerVerifiedAt: timestamp("buyer_verified_at", { withTimezone: true }),
  refundNeeded: boolean("refund_needed").notNull().default(false),
  // Set by the Stripe webhook if payment succeeded but the dates now conflict with an
  // approved booking made in the interim -- surfaced for manual admin resolution.
  conflictDetected: boolean("conflict_detected").notNull().default(false),
  // "boost" only: buyer optionally attaches a photo/poster for +$/day (see
  // addOnSettings). Held here (not yet on the target special/event) until
  // activateBooking() moves it onto specials.photoData/events.photoData -- mirrors why
  // every other product's effect only takes hold at activation, not at payment time.
  hasPhotoAddOn: boolean("has_photo_add_on").notNull().default(false),
  photoData: text("photo_data"),
  photoMimeType: text("photo_mime_type"),
  // Set only when this booking was paid from the venue's credit wallet instead of
  // Stripe (see lib/credits.ts) -- same units/value as priceCents, just a different
  // payment rail. stripeSessionId/stripePaymentIntentId stay null on a credit-paid
  // booking, and status goes straight to "pending_approval" (no "pending_payment"
  // hold, since the credits were already debited atomically at insert time).
  creditsSpentCents: integer("credits_spent_cents"),
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

export const addOnType = ["photo"] as const;
export type AddOnType = (typeof addOnType)[number];

// Small, separate settings table (rather than folding into monetizationSettings) since
// an add-on isn't an independently-bookable product -- it only ever rides along with a
// "boost" purchase, never validated against bookingProductType.
export const addOnSettings = specialsSchema.table("add_on_settings", {
  addOnType: text("add_on_type").$type<AddOnType>().primaryKey(),
  priceCentsPerDay: integer("price_cents_per_day").notNull(),
});

export const creditLedgerReason = ["free_trial", "purchase", "spend", "refund"] as const;
export type CreditLedgerReason = (typeof creditLedgerReason)[number];

// Append-only audit trail for venues.creditBalance -- every grant, purchase, spend, or
// refund gets a row here in the same transaction as the balance update (see
// lib/credits.ts), so the balance is always independently reconstructible by summing
// delta for a venueId. 1 credit = $1 (see lib/credits.ts's CENTS_PER_CREDIT), not a
// separate gamified currency -- credits reuse monetizationSettings.priceCentsPerDay
// directly instead of needing their own price list.
export const creditLedger = specialsSchema.table("credit_ledger", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(), // whole credits, positive (grant/purchase/refund) or negative (spend)
  reason: text("reason").$type<CreditLedgerReason>().notNull(),
  // "spend" and "refund" only -- which booking the credits were spent on / refunded from.
  relatedBookingId: integer("related_booking_id").references(() => bookings.id, { onDelete: "set null" }),
  // "purchase" only -- the Stripe Checkout session that paid for this credit bundle.
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Admin-configurable prepaid credit bundles, same "seeded with placeholder values,
// operator sets real numbers before this goes live" posture as monetizationSettings
// above. `credits` can exceed `priceCents / CENTS_PER_CREDIT` (see lib/credits.ts) --
// that gap is the bundle's bonus/discount, e.g. paying $250 for 275 credits. The
// smallest tier is expected to have no bonus (par value) so there's always a
// no-discount baseline option.
export const creditBundles = specialsSchema.table("credit_bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  credits: integer("credits").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// A resized photo can be hundreds of KB of base64 -- far too large to embed in the
// signed booking token, which round-trips through an email link's URL query param
// (verify-email -> confirm-email -> /advertise?verifiedToken=...). verify-email stages
// the photo here immediately and signs only this row's small integer id into the
// token; checkout copies it onto the bookings row and deletes the staging row.
// createdAt lets an unused/abandoned upload be swept later if that's ever needed --
// nothing currently cleans these up automatically, but volume is tiny (one row per
// verify-email call with a photo attached, consumed within the 30-minute token TTL).
export const pendingBookingPhotos = specialsSchema.table("pending_booking_photos", {
  id: serial("id").primaryKey(),
  photoData: text("photo_data").notNull(),
  photoMimeType: text("photo_mime_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Keyed by email, not venueId -- an inboundEmails row's venueId can be null
// (no match found; see app/api/webhooks/brevo-inbound/[token]/route.ts's
// fallback matching), so blocking has to work by address alone.
export const blockedSenders = specialsSchema.table("blocked_senders", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
});

// Base64-encoded, following this project's existing pattern for stored
// images (submissions.photoData, venuePhotos.photoData) rather than
// introducing external blob storage for a low-volume admin inbox.
export const emailAttachments = specialsSchema.table("email_attachments", {
  id: serial("id").primaryKey(),
  inboundEmailId: integer("inbound_email_id")
    .notNull()
    .references(() => inboundEmails.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  fileData: text("file_data").notNull(), // base64
  sizeBytes: integer("size_bytes").notNull(),
});

// One row per region "Ask" chat box question -- doubles as both an audit log (what are
// people actually asking) and the data source for the platform-wide daily query cap in
// lib/region-chat.ts, since this is the first real-time (non-batch) Anthropic cost this
// app has and needs a hard ceiling against a single day draining the account.
export const chatQueries = specialsSchema.table("chat_queries", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  tokensUsed: integer("tokens_used").notNull(),
  ip: text("ip").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
