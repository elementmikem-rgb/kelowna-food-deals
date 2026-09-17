CREATE TABLE "specials"."venue_chains" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specials"."venue_owner_venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_owner_id" integer NOT NULL,
	"venue_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."venue_owners" DROP CONSTRAINT "venue_owners_venue_id_venues_id_fk";
--> statement-breakpoint
DROP INDEX "specials"."venue_owners_venue_id_unique";--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN "chain_id" integer;--> statement-breakpoint
ALTER TABLE "specials"."venue_owner_venues" ADD CONSTRAINT "venue_owner_venues_venue_owner_id_venue_owners_id_fk" FOREIGN KEY ("venue_owner_id") REFERENCES "specials"."venue_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."venue_owner_venues" ADD CONSTRAINT "venue_owner_venues_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "specials"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_owner_venues_venue_id_unique" ON "specials"."venue_owner_venues" USING btree ("venue_id");--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD CONSTRAINT "venues_chain_id_venue_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "specials"."venue_chains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."venue_owners" DROP COLUMN "venue_id";