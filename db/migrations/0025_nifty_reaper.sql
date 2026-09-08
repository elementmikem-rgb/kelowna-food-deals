CREATE TABLE "specials"."blocked_senders" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"blocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_senders_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "specials"."email_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"inbound_email_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"file_data" text NOT NULL,
	"size_bytes" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."inbound_emails" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "specials"."email_attachments" ADD CONSTRAINT "email_attachments_inbound_email_id_inbound_emails_id_fk" FOREIGN KEY ("inbound_email_id") REFERENCES "specials"."inbound_emails"("id") ON DELETE cascade ON UPDATE no action;