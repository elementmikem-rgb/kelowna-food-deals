CREATE TABLE "specials"."push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "specials"."push_subscriptions" USING btree ("endpoint");