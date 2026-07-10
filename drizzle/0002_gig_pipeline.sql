ALTER TABLE "event" ADD COLUMN "status" text DEFAULT 'bestaetigt' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "fee" integer;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "contact_phone" text;