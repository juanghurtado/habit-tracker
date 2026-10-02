import { useMemo } from "react";
import { completionsOnDate } from "../lib/storage.ts";
import { cn, formatDateKey } from "../lib/utils.ts";
import type { Completion, Habit } from "../types.ts";

type Tier = 1 | 2 | 3;

interface Dot {
  color: string;
  tier: Tier;
}

interface DayCellData {
  dateKey: string;
  dayOfMonth: number;
  dots: Dot[];
  weekday: number; // 0 = Monday … 6 = Sunday
}

// Dot size as a fraction of its grid slot — scales with the cell automatically.
const TIER_FRACTION: Record<Tier, number> = { 1: 0.45, 2: 0.65, 3: 0.85 };

// Every cell shares one fixed 3×3 dot grid so dots line up across cells
// (a day with 1 dot and its neighbour with 6 use the same slot positions).
// Days with more habits than slots fall back to a larger per-day grid.
const SHARED_GRID_COLS = 3;
const SHARED_GRID_SLOTS = SHARED_GRID_COLS ** 2;

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

function getDaysInWindow(windowDays: number): Date[] {
  const today = new Date();
  const days: Date[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i
    );
    days.push(day);
  }
  return days;
}

// "How many completions does it take to reach each dot size" — the domain
// rule: 1 completion small, 2 medium, 3 or more large (capped).
function tierForCount(count: number): Tier {
  if (count >= 3) {
    return 3;
  }
  if (count === 2) {
    return 2;
  }
  return 1;
}

function buildDayCells(
  habits: Habit[],
  completions: Completion[],
  windowDays: number
): DayCellData[] {
  return getDaysInWindow(windowDays).map((day) => {
    const dots: Dot[] = [];
    for (const habit of habits) {
      const count = completionsOnDate(completions, day, habit.id).length;
      if (count === 0) {
        continue;
      }
      dots.push({ color: habit.color, tier: tierForCount(count) });
    }
    return {
      dateKey: formatDateKey(day),
      dayOfMonth: day.getDate(),
      weekday: (day.getDay() + 6) % 7,
      dots,
    };
  });
}

// Pads the days with nulls so the first row starts on Monday and every
// week is a full 7-cell row — the layout fills the full width.
function buildWeekRows(days: DayCellData[]): (DayCellData | null)[][] {
  const rows: (DayCellData | null)[][] = [];
  let row: (DayCellData | null)[] = [];
  for (const day of days) {
    if (day.weekday === 0 && row.length > 0) {
      rows.push(row);
      row = [];
    }
    while (row.length < day.weekday) {
      row.push(null);
    }
    row.push(day);
  }
  if (row.length > 0) {
    while (row.length < 7) {
      row.push(null);
    }
    rows.push(row);
  }
  return rows;
}

// Dots sit in the shared fixed grid so they align across cells; each dot's
// size is a fraction of its slot, capped to the slot size.
function DotGrid({ dots }: { dots: Dot[] }) {
  if (dots.length === 0) {
    return null;
  }
  const cols =
    dots.length <= SHARED_GRID_SLOTS
      ? SHARED_GRID_COLS
      : Math.ceil(Math.sqrt(dots.length));
  const rows =
    dots.length <= SHARED_GRID_SLOTS
      ? SHARED_GRID_COLS
      : Math.ceil(dots.length / cols);

  return (
    <div
      className="grid h-full w-full"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {dots.map((dot, index) => (
        // SVG circles scale uniformly to the slot's smaller axis, so every
        // dot is a perfect circle regardless of slot shape.
        <span key={`${dot.color}-${dot.tier}-${index}`}>
          <svg
            aria-hidden="true"
            className="block h-full w-full"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              fill={dot.color}
              r={50 * TIER_FRACTION[dot.tier]}
            />
          </svg>
        </span>
      ))}
    </div>
  );
}

function WeekdayHeader() {
  return (
    <div aria-hidden="true" className="grid grid-cols-7 gap-1.5">
      {WEEKDAY_INITIALS.map((initial, index) => (
        <span
          className="text-center font-medium text-[10px] text-muted-foreground"
          // Duplicate initials (T, S) are positional labels, not keys data.
          key={`weekday-${index}`}
        >
          {initial}
        </span>
      ))}
    </div>
  );
}

function EmptyCell() {
  return <div className="aspect-square rounded-md bg-transparent" />;
}

// Shared cell surface: filled days get a card look, empty days a muted one.
function cellClassName(hasDots: boolean): string {
  return hasDots ? "border border-border bg-card" : "bg-muted";
}

function SevenDayRow({ days }: { days: DayCellData[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => (
        <div className="space-y-1" key={day.dateKey}>
          <div
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl p-1.5",
              cellClassName(day.dots.length > 0)
            )}
          >
            <DotGrid dots={day.dots} />
          </div>
          <div className="text-center text-[10px] text-muted-foreground leading-none">
            {WEEKDAY_INITIALS[day.weekday]} {day.dayOfMonth}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthLayout({ days }: { days: DayCellData[] }) {
  const rows = useMemo(() => buildWeekRows(days), [days]);

  return (
    <div className="space-y-1.5">
      <WeekdayHeader />
      <div className="space-y-1.5">
        {rows.map((row, rowIndex) => (
          <div className="grid grid-cols-7 gap-1.5" key={`row-${rowIndex}`}>
            {row.map((day, dayIndex) =>
              day ? (
                <div
                  className={cn(
                    "flex aspect-square flex-col rounded-md p-1",
                    cellClassName(day.dots.length > 0)
                  )}
                  key={day.dateKey}
                >
                  <span className="shrink-0 pb-0.5 pl-0.5 text-[8px] text-muted-foreground leading-none">
                    {day.dayOfMonth}
                  </span>
                  <div className="min-h-0 flex-1">
                    <DotGrid dots={day.dots} />
                  </div>
                </div>
              ) : (
                <EmptyCell key={`empty-${rowIndex}-${dayIndex}`} />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityGrid({
  habits,
  completions,
  windowDays,
}: {
  habits: Habit[];
  completions: Completion[];
  windowDays: number;
}) {
  const days = useMemo(
    () => buildDayCells(habits, completions, windowDays),
    [completions, habits, windowDays]
  );

  return (
    <section className="space-y-3">
      <h2 className="font-bold text-muted-foreground text-sm">Activity</h2>
      {windowDays === 7 ? (
        <SevenDayRow days={days} />
      ) : (
        <MonthLayout days={days} />
      )}
    </section>
  );
}
