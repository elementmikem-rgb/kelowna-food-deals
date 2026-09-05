CREATE TABLE "specials"."analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"event_label" text,
	"page" text NOT NULL,
	"session_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"referrer" text,
	"country" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
