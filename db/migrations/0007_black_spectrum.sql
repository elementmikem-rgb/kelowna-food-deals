CREATE TABLE "specials"."inbound_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer,
	"brevo_message_id" text,
	"in_reply_to" text,
	"from_email" text NOT NULL,
	"from_name" text,
	"subject" text,
	"text_body" text,
	"html_body" text,
	"read" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specials"."outreach_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"brevo_message_id" text,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "specials"."inbound_emails" ADD CONSTRAINT "inbound_emails_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."outreach_sends" ADD CONSTRAINT "outreach_sends_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;