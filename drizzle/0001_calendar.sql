CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'sonstiges' NOT NULL,
	"title" text NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp,
	"all_day" boolean DEFAULT false NOT NULL,
	"location" text,
	"city" text,
	"ticket_url" text,
	"notes" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"source_key" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ical_token" text;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_ical_token_unique" UNIQUE("ical_token");