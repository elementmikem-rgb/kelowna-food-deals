CREATE TABLE "specials"."category_sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"sponsor_name" text NOT NULL,
	"sponsor_url" text,
	"sponsor_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN "partner_since" timestamp with time zone;