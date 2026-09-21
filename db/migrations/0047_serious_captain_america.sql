CREATE TABLE "specials"."chat_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"tokens_used" integer NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specials"."chat_queries" ADD CONSTRAINT "chat_queries_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "specials"."regions"("id") ON DELETE cascade ON UPDATE no action;