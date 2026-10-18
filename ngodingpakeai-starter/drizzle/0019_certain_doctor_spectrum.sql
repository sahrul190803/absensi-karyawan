ALTER TABLE "companies" ADD COLUMN "payroll_late_deduction_percent" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "payroll_alpha_deduction_percent" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "paid_by" text;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;