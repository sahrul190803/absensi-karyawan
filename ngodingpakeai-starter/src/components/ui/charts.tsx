import { cn } from "cn";

export type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

const DEFAULT_COLORS = [
  "#137A4A",
  "#A65D00",
  "#0C0A08",
  "#B42318",
  "#6E7601",
  "#B8BAAE",
];

export function DonutChart({
  data,
  title,
  centerLabel = "Total",
  size = 168,
  className,
  onSelect,
  activeLabel,
}: {
  data: ChartDatum[];
  title: string;
  centerLabel?: string;
  size?: number;
  className?: string;
  onSelect?: (label: string) => void;
  activeLabel?: string | null;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const segments: Array<ChartDatum & { dash: number; offset: number }> = [];
  let cursor = 0;
  data.forEach((item) => {
    if (item.value <= 0) return;
    const dash = (item.value / total) * circumference;
    segments.push({ ...item, dash, offset: cursor });
    cursor += dash;
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-6", className)}>
      <div
        role="img"
        aria-label={`${title}. ${data
          .map((item) => `${item.label} ${item.value}`)
          .join(", ")}.`}
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            className="text-muted"
          />
          {segments.map((item, index) => (
            <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={
                item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
              }
              strokeWidth="18"
              strokeDasharray={`${item.dash} ${circumference - item.dash}`}
              strokeDashoffset={-item.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-medium">{total}</span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>

      <ul className="min-w-40 flex-1 space-y-2">
        {data.map((item, index) => {
          const percent =
            total === 0 ? 0 : Math.round((item.value / total) * 100);
          const active = activeLabel === item.label;
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 flex-none rounded-[3px] border border-black/10"
                  style={{
                    background:
                      item.color ??
                      DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                  }}
                />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex-none font-mono text-xs text-muted-foreground">
                {item.value}
                <span className="ml-1.5">{percent}%</span>
              </span>
            </>
          );
          return (
            <li key={item.label}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(item.label)}
                  aria-pressed={active}
                  className={cn(
                    "-mx-2 flex w-full items-center justify-between gap-4 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                    active && "bg-primary-quiet",
                  )}
                >
                  {content}
                </button>
              ) : (
                <span className="flex items-center justify-between gap-4 text-sm">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BarList({
  data,
  title,
  valueSuffix = "",
  maxOverride,
  className,
}: {
  data: ChartDatum[];
  title: string;
  valueSuffix?: string;
  maxOverride?: number;
  className?: string;
}) {
  const max = maxOverride ?? Math.max(1, ...data.map((item) => item.value));

  return (
    <ul
      role="img"
      aria-label={`${title}. ${data
        .map((item) => `${item.label} ${item.value}${valueSuffix}`)
        .join(", ")}.`}
      className={cn("space-y-3", className)}
    >
      {data.map((item, index) => {
        const width = max === 0 ? 0 : Math.round((item.value / max) * 100);
        return (
          <li key={item.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{item.label}</span>
              <span className="flex-none font-mono text-xs text-muted-foreground">
                {item.value}
                {valueSuffix}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${width}%`,
                  background:
                    item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
