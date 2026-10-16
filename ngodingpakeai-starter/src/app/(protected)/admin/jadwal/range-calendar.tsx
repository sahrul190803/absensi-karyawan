"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isoDate, todayIso } from "@/lib/format";

export type DateRange = { from: string; to: string };

const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const parseIso = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  return copy;
};

const daysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const daysBetween = (from: string, to: string) =>
  Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86_400_000);

const orderRange = (a: string, b: string): DateRange =>
  a <= b ? { from: a, to: b } : { from: b, to: a };

const clampHover = (anchor: string, hover: string, maxDays: number) => {
  const distance = daysBetween(anchor, hover);
  if (Math.abs(distance) < maxDays) return hover;
  return isoDate(
    addDays(parseIso(anchor), distance > 0 ? maxDays - 1 : 1 - maxDays),
  );
};

const formatLong = (value: string) => {
  const date = parseIso(value);
  return `${date.getDate()} ${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}`;
};

const formatShort = (value: string) => {
  const date = parseIso(value);
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
};

export function RangeCalendar({
  value,
  maxDays = 92,
  onSelect,
}: {
  value: DateRange;
  maxDays?: number;
  onSelect: (range: DateRange) => void;
}) {
  const today = todayIso();
  const [month, setMonth] = useState(() => startOfMonth(parseIso(value.from)));
  const [focusDate, setFocusDate] = useState(() => value.from);
  const [drag, setDrag] = useState<{ anchor: string; hover: string } | null>(
    null,
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(drag);

  const dragging = drag !== null;

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const preview = drag
    ? orderRange(drag.anchor, clampHover(drag.anchor, drag.hover, maxDays))
    : value;

  useEffect(() => {
    if (!dragging) return;
    const finish = () => {
      const current = dragRef.current;
      if (!current) return;
      setDrag(null);
      onSelect(
        orderRange(current.anchor, clampHover(current.anchor, current.hover, maxDays)),
      );
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [dragging, maxDays, onSelect]);

  useEffect(() => {
    const target = gridRef.current?.querySelector<HTMLElement>(
      `[data-date="${focusDate}"]`,
    );
    target?.focus({ preventScroll: true });
  }, [focusDate, month]);

  const weeks = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month));
    const totalDays =
      daysBetween(isoDate(gridStart), isoDate(startOfMonth(month))) +
      daysInMonth(month);
    const cellCount = Math.ceil(totalDays / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) =>
      isoDate(addDays(gridStart, index)),
    );
  }, [month]);

  const dateAtPoint = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    return element instanceof HTMLElement
      ? (element.closest<HTMLElement>("[data-date]")?.dataset.date ?? null)
      : null;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.buttons & 1) === 0) return;
    setDrag((current) => {
      if (!current) return current;
      const date = dateAtPoint(event.clientX, event.clientY);
      if (!date || date === current.hover) return current;
      return { ...current, hover: date };
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = parseIso(focusDate);
    let next: Date | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(current, -1);
        break;
      case "ArrowRight":
        next = addDays(current, 1);
        break;
      case "ArrowUp":
        next = addDays(current, -7);
        break;
      case "ArrowDown":
        next = addDays(current, 7);
        break;
      case "Home":
        next = startOfWeek(current);
        break;
      case "End":
        next = addDays(startOfWeek(current), 6);
        break;
      case "PageUp":
      case "PageDown": {
        const offset = event.key === "PageUp" ? -1 : 1;
        next = startOfMonth(
          new Date(current.getFullYear(), current.getMonth() + offset, 1),
        );
        next.setDate(Math.min(current.getDate(), daysInMonth(next)));
        break;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        onSelect({ from: focusDate, to: focusDate });
        return;
      }
      default:
        return;
    }
    event.preventDefault();
    setMonth(startOfMonth(next));
    setFocusDate(isoDate(next));
  };

  const dayCount = daysBetween(preview.from, preview.to) + 1;
  const summary =
    dayCount === 1
      ? formatShort(preview.from)
      : `${formatShort(preview.from)} – ${formatShort(preview.to)}`;

  return (
    <div className="w-[19.5rem] select-none">
      <div className="flex items-center justify-between">
        <span className="pl-1 text-sm font-semibold">
          {MONTH_LONG[month.getMonth()]} {month.getFullYear()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Bulan sebelumnya"
            onClick={() =>
              setMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Bulan berikutnya"
            onClick={() =>
              setMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7" aria-hidden="true">
        {DAY_SHORT.map((label) => (
          <span
            key={label}
            className="grid h-8 place-items-center text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      <div
        ref={gridRef}
        role="group"
        aria-label={`Pilih rentang tanggal, ${MONTH_LONG[month.getMonth()]} ${month.getFullYear()}. Tarik dari tanggal awal ke tanggal akhir.`}
        className={`grid grid-cols-7 touch-none ${dragging ? "cursor-grabbing" : ""}`}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
      >
        {weeks.map((day) => {
          const parsed = parseIso(day);
          const outside = parsed.getMonth() !== month.getMonth();
          const isStart = day === preview.from;
          const isEnd = day === preview.to;
          const inRange = day >= preview.from && day <= preview.to;
          const isToday = day === today;
          const selected = isStart || isEnd;
          const classes = [
            "grid h-9 w-full place-items-center rounded-md font-mono text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
            selected
              ? "bg-primary font-semibold text-primary-foreground"
              : inRange
                ? "rounded-none bg-primary-quiet text-foreground"
                : outside
                  ? "text-muted-foreground/60 hover:bg-muted"
                  : "text-foreground hover:bg-muted",
            isToday && !inRange ? "font-semibold text-primary-text" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={day}
              type="button"
              data-date={day}
              tabIndex={day === focusDate ? 0 : -1}
              aria-pressed={inRange}
              aria-current={isToday ? "date" : undefined}
              aria-label={
                formatLong(day) + (isToday ? ", hari ini" : "")
              }
              className={classes}
              onFocus={() => setFocusDate(day)}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                setDrag({ anchor: day, hover: day });
              }}
            >
              {parsed.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="pl-1 font-mono text-xs text-muted-foreground">
          {summary} · {dayCount} hari
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onSelect({ from: today, to: today })}
        >
          Hari ini
        </Button>
      </div>
    </div>
  );
}
