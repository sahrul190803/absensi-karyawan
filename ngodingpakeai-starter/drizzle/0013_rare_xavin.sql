ALTER TABLE "employees" ADD COLUMN "bank_name" varchar(80) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "bank_account" varchar(40) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "ktp_number" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "ktp_photo_url" text;