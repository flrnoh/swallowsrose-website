CREATE TABLE "setlist" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"event_id" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setlist_item" (
	"id" text PRIMARY KEY NOT NULL,
	"setlist_id" text NOT NULL,
	"song_id" text NOT NULL,
	"position" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "song" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"duration_seconds" integer,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"source_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "song_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "setlist" ADD CONSTRAINT "setlist_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setlist" ADD CONSTRAINT "setlist_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setlist_item" ADD CONSTRAINT "setlist_item_setlist_id_setlist_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "public"."setlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setlist_item" ADD CONSTRAINT "setlist_item_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE cascade ON UPDATE no action;