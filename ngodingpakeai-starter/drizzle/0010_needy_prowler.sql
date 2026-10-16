CREATE TABLE "trainings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(160) NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"place" varchar(200) DEFAULT '' NOT NULL,
	"department_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"session" varchar(16) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"generated_by" text,
	"finalized_by" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"salary_type" varchar(16) NOT NULL,
	"base_salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"present_days" integer DEFAULT 0 NOT NULL,
	"late_days" integer DEFAULT 0 NOT NULL,
	"alpha_days" integer DEFAULT 0 NOT NULL,
	"excused_days" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"meal_claim_count" integer DEFAULT 0 NOT NULL,
	"base_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"late_deduction" numeric(12, 2) DEFAULT '0' NOT NULL,
	"alpha_deduction" numeric(12, 2) DEFAULT '0' NOT NULL,
	"overtime_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_adjustment" numeric(12, 2) DEFAULT '0' NOT NULL,
	"adjustment_note" text DEFAULT '' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ALTER COLUMN "work_location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "salary_type" varchar(16) DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "base_salary" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_claims" ADD CONSTRAINT "meal_claims_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_generated_by_user_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_finalized_by_user_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trainings_date_idx" ON "trainings" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_claims_employee_date_key" ON "meal_claims" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "meal_claims_date_idx" ON "meal_claims" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_periods_year_month_key" ON "payroll_periods" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "payroll_periods_status_idx" ON "payroll_periods" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_entries_period_employee_key" ON "payroll_entries" USING btree ("period_id","employee_id");--> statement-breakpoint
CREATE INDEX "payroll_entries_employee_idx" ON "payroll_entries" USING btree ("employee_id");