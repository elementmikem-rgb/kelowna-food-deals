import { pgTable, pgSchema, uniqueIndex, foreignKey, serial, text, doublePrecision, boolean, timestamp, integer, smallint, time, real, date, jsonb, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const specials = pgSchema("specials");


export const venuesInSpecials = specials.table("venues", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	address: text().notNull(),
	lat: doublePrecision(),
	lng: doublePrecision(),
	phone: text(),
	website: text(),
	menuUrl: text("menu_url"),
	instagramHandle: text("instagram_handle"),
	sourceUrls: text("source_urls").array().default([""]).notNull(),
	active: boolean().default(true).notNull(),
	contactEmail: text("contact_email"),
	requiresBrowser: boolean("requires_browser").default(false).notNull(),
	unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true, mode: 'string' }),
	city: text(),
	region: text().default('central-okanagan').notNull(),
	featuredUntil: timestamp("featured_until", { withTimezone: true, mode: 'string' }),
	partnerSince: timestamp("partner_since", { withTimezone: true, mode: 'string' }),
	regionId: integer("region_id"),
}, (table) => [
	uniqueIndex("venues_name_unique").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regionsInSpecials.id],
			name: "venues_region_id_regions_id_fk"
		}),
]);

export const scrapeRunsInSpecials = specials.table("scrape_runs", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id").notNull(),
	ranAt: timestamp("ran_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	contentHash: text("content_hash"),
	changed: boolean().notNull(),
	tokensUsed: integer("tokens_used").default(0).notNull(),
	error: text(),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "scrape_runs_venue_id_venues_id_fk"
		}).onDelete("cascade"),
]);

export const inboundEmailsInSpecials = specials.table("inbound_emails", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id"),
	brevoMessageId: text("brevo_message_id"),
	inReplyTo: text("in_reply_to"),
	fromEmail: text("from_email").notNull(),
	fromName: text("from_name"),
	subject: text(),
	textBody: text("text_body"),
	htmlBody: text("html_body"),
	read: boolean().default(false).notNull(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "inbound_emails_venue_id_venues_id_fk"
		}).onDelete("set null"),
]);

export const outreachSendsInSpecials = specials.table("outreach_sends", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id"),
	toEmail: text("to_email").notNull(),
	subject: text().notNull(),
	htmlBody: text("html_body").notNull(),
	status: text().default('queued').notNull(),
	brevoMessageId: text("brevo_message_id"),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	openedAt: timestamp("opened_at", { withTimezone: true, mode: 'string' }),
	clickedAt: timestamp("clicked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "outreach_sends_venue_id_venues_id_fk"
		}).onDelete("cascade"),
]);

export const specialsInSpecials = specials.table("specials", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id").notNull(),
	title: text().notNull(),
	description: text(),
	priceCents: integer("price_cents"),
	dayOfWeek: smallint("day_of_week"),
	startTime: time("start_time"),
	endTime: time("end_time"),
	category: text().notNull(),
	lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true, mode: 'string' }).notNull(),
	sourceUrl: text("source_url"),
	confidence: real().default(1).notNull(),
	extractionNotes: text("extraction_notes"),
	isMonthly: boolean("is_monthly").default(false).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	region: text().default('central-okanagan').notNull(),
	boostedUntil: timestamp("boosted_until", { withTimezone: true, mode: 'string' }),
	monthlyThroughDate: date("monthly_through_date"),
	regionId: integer("region_id"),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "specials_venue_id_venues_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regionsInSpecials.id],
			name: "specials_region_id_regions_id_fk"
		}),
]);

export const categorySponsorsInSpecials = specials.table("category_sponsors", {
	id: serial().primaryKey().notNull(),
	category: text().notNull(),
	sponsorName: text("sponsor_name").notNull(),
	sponsorUrl: text("sponsor_url"),
	sponsorUntil: timestamp("sponsor_until", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const menuItemsInSpecials = specials.table("menu_items", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id").notNull(),
	name: text().notNull(),
	description: text(),
	priceCents: integer("price_cents"),
	lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true, mode: 'string' }).notNull(),
	sourceUrl: text("source_url"),
	confidence: real().default(1).notNull(),
	extractionNotes: text("extraction_notes"),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "menu_items_venue_id_venues_id_fk"
		}).onDelete("cascade"),
]);

export const eventsInSpecials = specials.table("events", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id"),
	title: text().notNull(),
	description: text(),
	eventType: text("event_type").notNull(),
	dayOfWeek: smallint("day_of_week"),
	specificDate: date("specific_date"),
	startTime: time("start_time"),
	endTime: time("end_time"),
	coverChargeCents: integer("cover_charge_cents"),
	lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true, mode: 'string' }).notNull(),
	sourceUrl: text("source_url"),
	confidence: real().default(1).notNull(),
	extractionNotes: text("extraction_notes"),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	locationName: text("location_name"),
	locationAddress: text("location_address"),
	region: text().default('central-okanagan').notNull(),
	regionId: integer("region_id"),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "events_venue_id_venues_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regionsInSpecials.id],
			name: "events_region_id_regions_id_fk"
		}),
]);

export const analyticsEventsInSpecials = specials.table("analytics_events", {
	id: serial().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	eventLabel: text("event_label"),
	page: text().notNull(),
	sessionId: text("session_id").notNull(),
	visitorId: text("visitor_id").notNull(),
	referrer: text(),
	country: text(),
	utmSource: text("utm_source"),
	utmMedium: text("utm_medium"),
	utmCampaign: text("utm_campaign"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const rateLimitsInSpecials = specials.table("rate_limits", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	windowStart: timestamp("window_start", { withTimezone: true, mode: 'string' }).notNull(),
	count: integer().default(1).notNull(),
}, (table) => [
	uniqueIndex("rate_limits_key_window_unique").using("btree", table.key.asc().nullsLast().op("text_ops"), table.windowStart.asc().nullsLast().op("text_ops")),
]);

export const submissionsInSpecials = specials.table("submissions", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id"),
	submissionType: text("submission_type"),
	rawText: text("raw_text"),
	photoData: text("photo_data"),
	photoMimeType: text("photo_mime_type"),
	status: text().default('needs_review').notNull(),
	aiExtracted: jsonb("ai_extracted"),
	aiConfidence: real("ai_confidence"),
	aiNotes: text("ai_notes"),
	resultingRowId: integer("resulting_row_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	resolvedItemKeys: text("resolved_item_keys").array().default([""]).notNull(),
	venueName: text("venue_name"),
	venueAddress: text("venue_address"),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "submissions_venue_id_venues_id_fk"
		}).onDelete("cascade"),
]);

export const bookingsInSpecials = specials.table("bookings", {
	id: serial().primaryKey().notNull(),
	productType: text("product_type").notNull(),
	venueId: integer("venue_id"),
	specialId: integer("special_id"),
	category: text(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	status: text().default('pending_payment').notNull(),
	reservedUntil: timestamp("reserved_until", { withTimezone: true, mode: 'string' }),
	priceCents: integer("price_cents").notNull(),
	stripeSessionId: text("stripe_session_id"),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	buyerEmail: text("buyer_email").notNull(),
	buyerVerifiedAt: timestamp("buyer_verified_at", { withTimezone: true, mode: 'string' }),
	refundNeeded: boolean("refund_needed").default(false).notNull(),
	conflictDetected: boolean("conflict_detected").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "bookings_venue_id_venues_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.specialId],
			foreignColumns: [specialsInSpecials.id],
			name: "bookings_special_id_specials_id_fk"
		}).onDelete("cascade"),
]);

export const venuePhotosInSpecials = specials.table("venue_photos", {
	id: serial().primaryKey().notNull(),
	venueId: integer("venue_id").notNull(),
	photoData: text("photo_data").notNull(),
	photoMimeType: text("photo_mime_type").notNull(),
	caption: text(),
	submissionId: integer("submission_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("venue_photos_submission_id_unique").using("btree", table.submissionId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venuesInSpecials.id],
			name: "venue_photos_venue_id_venues_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.submissionId],
			foreignColumns: [submissionsInSpecials.id],
			name: "venue_photos_submission_id_submissions_id_fk"
		}).onDelete("set null"),
]);

export const regionsInSpecials = specials.table("regions", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	domain: text().notNull(),
	brandName: text("brand_name").notNull(),
	logoUrl: text("logo_url").notNull(),
	accentColor: text("accent_color").notNull(),
	accentDimColor: text("accent_dim_color").notNull(),
	accentSoftColor: text("accent_soft_color").notNull(),
	backgroundColor: text("background_color").notNull(),
	foregroundColor: text("foreground_color").notNull(),
	evergreenColor: text("evergreen_color").notNull(),
	mailingAddress: text("mailing_address").notNull(),
	contactEmail: text("contact_email").notNull(),
	tokenCeiling: integer("token_ceiling").default(50000).notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("regions_slug_unique").on(table.slug),
	unique("regions_domain_unique").on(table.domain),
]);

export const monetizationSettingsInSpecials = specials.table("monetization_settings", {
	productType: text("product_type").primaryKey().notNull(),
	capCount: integer("cap_count"),
	priceCentsPerDay: integer("price_cents_per_day").notNull(),
	minDays: integer("min_days").notNull(),
	maxDays: integer("max_days").notNull(),
	regionId: integer("region_id"),
}, (table) => [
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regionsInSpecials.id],
			name: "monetization_settings_region_id_regions_id_fk"
		}),
]);
