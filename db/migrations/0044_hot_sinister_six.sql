CREATE TABLE "specials"."venue_claim_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" text,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "specials"."venue_owner_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_owner_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specials"."venue_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "specials"."venue_claim_requests" ADD CONSTRAINT "venue_claim_requests_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."venue_owner_sessions" ADD CONSTRAINT "venue_owner_sessions_venue_owner_id_venue_owners_id_fk" FOREIGN KEY ("venue_owner_id") REFERENCES "specials"."venue_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."venue_owners" ADD CONSTRAINT "venue_owners_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_owner_sessions_token_unique" ON "specials"."venue_owner_sessions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_owners_venue_id_unique" ON "specials"."venue_owners" USING btree ("venue_id");