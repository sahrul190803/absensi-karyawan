import Link from "next/link";
import { Coffee } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "cn";

export function Brand({
  href = "/app",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
      aria-label={`${siteConfig.name} — beranda`}
    >
      <span className="flex size-8 items-center justify-center rounded-lg border border-border-strong bg-primary text-primary-foreground">
        <Coffee className="size-4" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold">
          Hadirku
          <span className="ml-1.5 font-medium text-muted-foreground">
            Lecarassa
          </span>
        </span>
        <span className="block text-[11px] font-medium text-muted-foreground">
          Absensi kehadiran karyawan
        </span>
      </span>
    </Link>
  );
}
