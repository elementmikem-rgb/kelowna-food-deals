ALTER TABLE "specials"."events" ADD COLUMN "team_code" text;--> statement-breakpoint
ALTER TABLE "specials"."events" ADD COLUMN "game_home" boolean;--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "game_teams" text[];--> statement-breakpoint
ALTER TABLE "specials"."specials" ADD COLUMN "game_scope" text;