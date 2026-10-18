CREATE TABLE "payroll_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid,
	"entry_id" uuid,
	"employee_id" uuid NOT NULL,
	"period_label" varchar(40) NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"base_salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deduction" numeric(12, 2) DEFAULT '0' NOT NULL,
	"overtime_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"adjustment" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" varchar(24) DEFAULT 'paid' NOT NULL,
	"method" varchar(24) DEFAULT 'transfer' NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"paid_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "payroll_late_rate_per_minute" numeric(12, 2) DEFAULT '2000' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "payroll_alpha_rate_per_day" numeric(12, 2) DEFAULT '100000' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "payroll_permission_percent" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "allowance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "bank_account_name" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "late_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "allowance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "late_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "permission_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "gross_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "permission_deduction" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD COLUMN "payment_method" varchar(24) DEFAULT 'transfer' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_entry_id_payroll_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."payroll_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payroll_payments_employee_idx" ON "payroll_payments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_payments_period_idx" ON "payroll_payments" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "payroll_payments_date_idx" ON "payroll_payments" USING btree ("payment_date");