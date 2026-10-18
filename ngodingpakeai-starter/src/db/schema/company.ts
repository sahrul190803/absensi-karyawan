import {
  boolean,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  timezone: varchar("timezone", { length: 64 })
    .default("Asia/Jakarta")
    .notNull(),
  allowHolidayWork: boolean("allow_holiday_work").default(false).notNull(),
  gpsAccuracyLimitM: integer("gps_accuracy_limit_m").default(50).notNull(),
  defaultRadiusM: integer("default_radius_m").default(100).notNull(),
  defaultToleranceMinutes: integer("default_tolerance_minutes")
    .default(15)
    .notNull(),
  // Aturan potongan payroll: nominal denda per menit terlambat, nominal
  // potongan per hari alpha, dan persentase potongan izin (setengah hari).
  payrollLateRatePerMinute: numeric("payroll_late_rate_per_minute", {
    precision: 12,
    scale: 2,
  })
    .default("2000")
    .notNull(),
  payrollAlphaRatePerDay: numeric("payroll_alpha_rate_per_day", {
    precision: 12,
    scale: 2,
  })
    .default("100000")
    .notNull(),
  payrollPermissionPercent: integer("payroll_permission_percent")
    .default(50)
    .notNull(),
  payrollLateDeductionPercent: integer("payroll_late_deduction_percent")
    .default(10)
    .notNull(),
  payrollAlphaDeductionPercent: integer("payroll_alpha_deduction_percent")
    .default(100)
    .notNull(),
  payday: integer("payday").default(25).notNull(),
  // Verifikasi wajah (P3). Nonaktif secara default; hanya diberlakukan bila
  // provider face API sudah dikonfigurasi di server (fail-closed).
  faceVerificationEnabled: boolean("face_verification_enabled")
    .default(false)
    .notNull(),
  faceSimilarityThreshold: integer("face_similarity_threshold")
    .default(60)
    .notNull(),
  faceLivenessRequired: boolean("face_liveness_required")
    .default(true)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
