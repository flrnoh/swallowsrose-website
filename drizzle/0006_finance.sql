CREATE TABLE "finance_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"category" text DEFAULT 'sonstiges' NOT NULL,
	"title" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" text,
	"occurred_at" timestamp NOT NULL,
	"event_id" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance_entry" ADD CONSTRAINT "finance_entry_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entry" ADD CONSTRAINT "finance_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;