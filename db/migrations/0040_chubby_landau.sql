ALTER TABLE "specials"."scrape_runs" ADD COLUMN "cache_creation_tokens" integer;--> statement-breakpoint
ALTER TABLE "specials"."scrape_runs" ADD COLUMN "cache_read_tokens" integer;--> statement-breakpoint
ALTER TABLE "specials"."scrape_runs" ADD COLUMN "output_tokens" integer;