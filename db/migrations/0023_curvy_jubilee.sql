ALTER TABLE "specials"."events" ALTER COLUMN "region_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."specials" ALTER COLUMN "region_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."venues" ALTER COLUMN "region_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "specials"."events" DROP COLUMN "region";--> statement-breakpoint
ALTER TABLE "specials"."specials" DROP COLUMN "region";--> statement-breakpoint
ALTER TABLE "specials"."venues" DROP COLUMN "region";