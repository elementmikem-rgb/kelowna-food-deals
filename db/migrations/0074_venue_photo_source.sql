ALTER TABLE "specials"."venue_photos" ADD COLUMN "source" text DEFAULT 'visitor' NOT NULL;--> statement-breakpoint
UPDATE "specials"."venue_photos" SET "source" = 'google' WHERE "submission_id" IS NULL AND "caption" IS NULL AND "created_at"::date = '2026-10-04';--> statement-breakpoint
UPDATE "specials"."venue_photos" SET "source" = 'owner' WHERE "id" IN (930, 931, 932, 934);
