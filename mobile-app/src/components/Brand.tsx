import { Coffee } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "cn";

export function Brand({
  href = "/app",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      to={href}
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 overflow-hidden rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
      aria-label="Hadirku Lecarassa — beranda"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-primary text-primary-foreground">
        <Coffee className="size-4" aria-hidden="true" />
      </span>
      <span className={cn("min-w-0 flex-1", compact ? "leading-none" : "leading-tight")}>
        <span className="block truncate text-[15px] font-semibold">
          Hadirku
          <span className="ml-1.5 font-medium text-muted-foreground">
            Lecarassa
          </span>
        </span>
        {!compact && (
          <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
            Absensi kehadiran karyawan
          </span>
        )}
      </span>
    </Link>
  );
}
