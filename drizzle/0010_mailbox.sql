CREATE TABLE "mail_thread" (
	"thread_id" text PRIMARY KEY NOT NULL,
	"assignee_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_thread" ADD CONSTRAINT "mail_thread_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;