export type AdminAttendanceRow = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  lateMinutes: number | null;
  notes: string | null;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  checkInPhotoId: string | null;
  checkOutPhotoId: string | null;
  employeeName: string;
  employeeNik: string;
  locationName: string;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
};

export type AdminAttendanceResponse = {
  data: AdminAttendanceRow[];
  meta: { date: string; limit: number; offset: number; hasMore: boolean };
};

export type AdminRequestRow = {
  id: string;
  type: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  attachmentUrl: string | null;
  status: string;
  decisionNote: string | null;
  createdAt: string;
  employeeName: string;
  employeeEmail: string;
};

export type AdminRequestResponse = {
  data: AdminRequestRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

export type EmployeeRow = {
  id: string;
  userId: string;
  nik: string;
  fullName: string;
  phone: string;
  address: string;
  photoUrl: string | null;
  departmentId: string | null;
  positionId: string | null;
  workLocationId: string | null;
  joinDate: string | null;
  employmentStatus: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  ktpNumber: string;
  ktpPhotoUrl: string | null;
  salaryType: string;
  baseSalary: string;
  allowance: string;
  departmentName: string | null;
  positionName: string | null;
};

export type EmployeeResponse = {
  data: EmployeeRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

export type MealClaimRow = {
  id: string;
  employeeId: string;
  date: string;
  session: string;
  note: string | null;
  claimedAt: string | null;
  employeeName: string;
  employeeNik: string;
  departmentName: string | null;
};

export type MealTotals = {
  total: number;
  pagi: number;
  siang: number;
  malam: number;
};

export type MealClaimsResponse = {
  data: MealClaimRow[];
  meta: {
    limit: number;
    offset: number;
    hasMore: boolean;
    totals: MealTotals;
    unclaimed: MealTotals;
  };
};

export type UnclaimedMealRow = {
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  departmentName: string | null;
  date: string;
  session: string;
  shiftName: string | null;
};

export type UnclaimedMealResponse = {
  data: UnclaimedMealRow[];
  meta: {
    limit: number;
    offset: number;
    hasMore: boolean;
    totals: MealTotals;
  };
};

export type ReportRow = {
  id: string;
  userId: string;
  fullName: string;
  nik: string;
  departmentName: string | null;
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
  lemburJam: number;
};

export type ReportTotals = {
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
  lemburJam: number;
};

export type ReportResponse = {
  data: ReportRow[];
  meta: {
    period: "day" | "month" | "year";
    label: string;
    from: string;
    to: string;
    totals: ReportTotals;
  };
};

export type ScheduleRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  note: string | null;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  crossesMidnight: boolean;
  workLocationId: string;
  locationName: string;
  allowedLocationIds: string[];
};

export type ScheduleResponse = {
  data: ScheduleRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

export type ShiftRow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  crossesMidnight: boolean;
  active: boolean;
};

export type WorkLocationRow = {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusM: number;
  description: string;
  active: boolean;
};

export type TrainingRow = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  notes: string | null;
  participants: Array<{
    employeeId: string;
    fullName: string;
    nik: string;
    departmentName: string | null;
    positionName: string | null;
  }>;
};

export type TrainingResponse = {
  data: TrainingRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

export type DepartmentRow = {
  id: string;
  code: string | null;
  name: string;
  managerUserId: string | null;
  active: boolean;
};

export type PositionRow = {
  id: string;
  name: string;
  departmentId: string | null;
  level: number;
  active: boolean;
};

export type PayrollPeriod = {
  id: string;
  year: number;
  month: number;
  status: string;
  note: string | null;
  generatedBy: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  paidBy: string | null;
  paidAt: string | null;
  createdAt: string;
  employeeCount: number;
  total: number;
};

export type PayrollPeriodResponse = {
  data: PayrollPeriod[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

export type PayrollEntry = {
  id: string;
  periodId: string;
  employeeId: string;
  salaryType: string;
  baseSalary: string;
  allowance: string;
  scheduledDays: number;
  presentDays: number;
  lateDays: number;
  lateMinutes: number;
  alphaDays: number;
  excusedDays: number;
  permissionDays: number;
  overtimeMinutes: number;
  mealClaimCount: number;
  baseAmount: string;
  grossAmount: string;
  lateDeduction: string;
  alphaDeduction: string;
  permissionDeduction: string;
  overtimeAmount: string;
  otherAdjustment: string;
  adjustmentNote: string | null;
  isHidden: boolean;
  paymentMethod: string;
  total: string;
  paidAt: string | null;
  paidBy: string | null;
  employeeName: string;
  employeeNik: string;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
};

export type PayrollDetailResponse = {
  data: {
    period: {
      id: string;
      year: number;
      month: number;
      status: string;
      note: string | null;
      finalizedAt: string | null;
      paidAt: string | null;
    };
    entries: PayrollEntry[];
    meta: {
      totals: {
        presentDays: number;
        lateDays: number;
        alphaDays: number;
        overtimeMinutes: number;
        mealClaimCount: number;
        total: number;
      };
    };
  };
};

export type PayrollDailyRow = {
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  photoUrl: string | null;
  salaryType: string;
  baseSalary: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  departmentName: string | null;
  positionName: string | null;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  lateMinutes: number;
  alphaDays: number;
  permissionDays: number;
  baseAmount: string;
  lateDeduction: string;
  alphaDeduction: string;
  permissionDeduction: string;
  totalDeduction: string;
  netAmount: string;
  isPaid: boolean;
};

export type PayrollDailyResponse = {
  data: {
    date: string;
    year: number;
    month: number;
    rates: {
      lateRate: number;
      alphaRate: number;
      permissionPercent: number;
    };
    rows: PayrollDailyRow[];
  };
};

export type PayrollPaymentRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  photoUrl: string | null;
  departmentName: string | null;
  positionName: string | null;
  periodLabel: string;
  periodYear: number;
  periodMonth: number;
  paymentDate: string;
  baseSalary: string;
  allowance: string;
  grossAmount: string;
  totalDeduction: string;
  overtimeAmount: string;
  adjustment: string;
  netAmount: string;
  status: string;
  method: string;
  isHidden: boolean;
};

export type PayrollPaymentResponse = {
  data: PayrollPaymentRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

export type SettingsResponse = {
  data: {
    name: string;
    timezone: string;
    allowHolidayWork: boolean;
    gpsAccuracyLimitM: number;
    defaultRadiusM: number;
    defaultToleranceMinutes: number;
    payrollLateRatePerMinute: string;
    payrollAlphaRatePerDay: string;
    payrollPermissionPercent: number;
    payday: number;
    faceVerificationEnabled: boolean;
    faceSimilarityThreshold: number;
    faceLivenessRequired: boolean;
    faceProviderConfigured: boolean;
  };
};
