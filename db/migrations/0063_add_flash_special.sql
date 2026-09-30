ALTER TABLE "specials"."specials" ADD COLUMN "flash_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "flash_claim_limit" integer;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "flash_claim_count" integer DEFAULT 0 NOT NULL;