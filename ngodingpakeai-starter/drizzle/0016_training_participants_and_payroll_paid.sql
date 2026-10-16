CREATE TABLE "training_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trainings" DROP CONSTRAINT "trainings_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "trainings" DROP CONSTRAINT "trainings_position_id_positions_id_fk";
--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD COLUMN "paid_by" text;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "training_participants_training_employee_key" ON "training_participants" USING btree ("training_id","employee_id");--> statement-breakpoint
CREATE INDEX "training_participants_employee_idx" ON "training_participants" USING btree ("employee_id");--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" DROP COLUMN "department_id";--> statement-breakpoint
ALTER TABLE "trainings" DROP COLUMN "position_id";
