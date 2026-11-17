const TIMEZONE = "Asia/Jakarta";

export const clock = (value?: string | null) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
};

export const shortTime = (value?: string | null) =>
  value ? value.slice(0, 5) : "--:--";

export const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(
    "id-ID",
    options ?? { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
};

export const monthLabel = (month: string) => {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, (monthPart ?? 1) - 1, 1));
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const isoDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const todayIso = () => isoDate(new Date());

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const STATUS_LABELS: Record<string, string> = {
  present: "Hadir",
  late: "Terlambat",
  early_leave: "Pulang cepat",
  alpha: "Alpha",
  holiday_work: "Kerja hari libur",
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  leave: "Cuti",
  sick: "Sakit",
  permission: "Izin",
  business_trip: "Dinas Luar",
  overtime: "Lembur",
  shift_swap: "Tukar Shift",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export const statusLabel = (status: string) =>
  STATUS_LABELS[status] ?? status;
