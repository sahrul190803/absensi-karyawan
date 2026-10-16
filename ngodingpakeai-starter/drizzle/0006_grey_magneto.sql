CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"channel" varchar(16) NOT NULL,
	"event" varchar(64) NOT NULL,
	"target" varchar(254) NOT NULL,
	"status" varchar(16) NOT NULL,
	"error" text,
	"dedupe_key" varchar(160),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_logs_event_idx" ON "notification_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "notification_logs_dedupe_idx" ON "notification_logs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notification_logs_user_idx" ON "notification_logs" USING btree ("user_id");