CREATE TABLE "specials"."countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"mailing_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "specials"."provinces" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."regions" ADD COLUMN "province_id" integer;--> statement-breakpoint
ALTER TABLE "specials"."provinces" ADD CONSTRAINT "provinces_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "specials"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provinces_country_code_idx" ON "specials"."provinces" USING btree ("country_id","code");--> statement-breakpoint
ALTER TABLE "specials"."regions" ADD CONSTRAINT "regions_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "specials"."provinces"("id") ON DELETE no action ON UPDATE no action;