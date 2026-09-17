CREATE TABLE "specials"."image_transcriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"content_hash" text NOT NULL,
	"transcribed_text" text NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "image_transcriptions_image_url_unique" ON "specials"."image_transcriptions" USING btree ("image_url");