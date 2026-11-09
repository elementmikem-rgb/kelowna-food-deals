CREATE TABLE "specials"."accessibility_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"feature" text NOT NULL,
	"answer" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."accessibility_votes" ADD CONSTRAINT "accessibility_votes_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accessibility_votes_venue_feature_token" ON "specials"."accessibility_votes" USING btree ("venue_id","feature","token_hash");--> statement-breakpoint
CREATE INDEX "accessibility_votes_venue" ON "specials"."accessibility_votes" USING btree ("venue_id");