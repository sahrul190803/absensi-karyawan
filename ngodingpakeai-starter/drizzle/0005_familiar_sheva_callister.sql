CREATE TABLE "attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"requested_by" text NOT NULL,
	"reason" text NOT NULL,
	"old_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"new_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"default_quota" double precision DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"opening_balance" double precision DEFAULT 0 NOT NULL,
	"used" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "check_in_idempotency_key" varchar(64);--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "check_out_idempotency_key" varchar(64);--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_id_attendance_records_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_corrections_attendance_idx" ON "attendance_corrections" USING btree ("attendance_id");--> statement-breakpoint
CREATE INDEX "attendance_corrections_status_idx" ON "attendance_corrections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_corrections_requester_idx" ON "attendance_corrections" USING btree ("requested_by");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_balances_employee_type_year_key" ON "leave_balances" USING btree ("employee_id","leave_type_id","year");--> statement-breakpoint
CREATE INDEX "leave_balances_employee_idx" ON "leave_balances" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_check_in_idempotency_key" ON "attendance_records" USING btree ("check_in_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_check_out_idempotency_key" ON "attendance_records" USING btree ("check_out_idempotency_key");