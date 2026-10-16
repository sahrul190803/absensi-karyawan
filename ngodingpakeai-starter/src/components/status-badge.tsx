import { cn } from "cn";
import {
  REQUEST_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/format";

type Tone = "positive" | "warning" | "danger" | "muted" | "pending" | "info";

const TONES: Record<Tone, string> = {
  positive: "bg-positive text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  muted: "bg-muted text-muted-foreground border border-border-strong",
  pending: "border border-border-strong text-foreground",
  info: "bg-primary-quiet text-primary-text border border-border-strong",
};

const ATTENDANCE_TONES: Record<string, Tone> = {
  present: "positive",
  holiday_work: "info",
  late: "warning",
  early_leave: "warning",
  alpha: "danger",
};

const REQUEST_TONES: Record<string, Tone> = {
  approved: "positive",
  rejected: "danger",
  cancelled: "muted",
  pending: "pending",
};

export function StatusBadge({
  status,
  kind = "attendance",
  className,
}: {
  status: string;
  kind?: "attendance" | "request";
  className?: string;
}) {
  const label =
    kind === "request"
      ? (REQUEST_STATUS_LABELS[status] ?? status)
      : (STATUS_LABELS[status] ?? status);
  const tone =
    kind === "request"
      ? (REQUEST_TONES[status] ?? "muted")
      : (ATTENDANCE_TONES[status] ?? "muted");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
