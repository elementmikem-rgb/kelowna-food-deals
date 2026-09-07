CREATE TABLE "specials"."regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"domain" text NOT NULL,
	"brand_name" text NOT NULL,
	"logo_url" text NOT NULL,
	"accent_color" text NOT NULL,
	"accent_dim_color" text NOT NULL,
	"accent_soft_color" text NOT NULL,
	"background_color" text NOT NULL,
	"foreground_color" text NOT NULL,
	"evergreen_color" text NOT NULL,
	"mailing_address" text NOT NULL,
	"contact_email" text NOT NULL,
	"token_ceiling" integer DEFAULT 50000 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "regions_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "specials"."events" ADD COLUMN "region_id" integer;--> statement-breakpoint
ALTER TABLE "specials"."monetization_settings" ADD COLUMN "region_id" integer;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "region_id" integer;--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD COLUMN "region_id" integer;--> statement-breakpoint
ALTER TABLE "specials"."events" ADD CONSTRAINT "events_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."monetization_settings" ADD CONSTRAINT "monetization_settings_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD CONSTRAINT "specials_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specials"."venues" ADD CONSTRAINT "venues_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE no action ON UPDATE no action;