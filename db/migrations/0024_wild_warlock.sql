CREATE TABLE "specials"."deal_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"kind" text NOT NULL,
	"feedback_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "venue_confirmed_at" timestamp with time zone;