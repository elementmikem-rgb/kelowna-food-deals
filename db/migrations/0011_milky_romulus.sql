CREATE TABLE "specials"."rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_key_window_unique" ON "specials"."rate_limits" USING btree ("key","window_start");