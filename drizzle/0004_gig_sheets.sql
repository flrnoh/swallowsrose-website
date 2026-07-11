CREATE TABLE "gig_sheet" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"load_in" text,
	"soundcheck" text,
	"doors" text,
	"stage_time" text,
	"set_length" text,
	"address" text,
	"parking" text,
	"accommodation" text,
	"catering" text,
	"backline" text,
	"contact_on_site" text,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gig_sheet_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "gig_sheet" ADD CONSTRAINT "gig_sheet_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;