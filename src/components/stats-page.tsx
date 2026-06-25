import {
  BarChart3,
  Calendar,
  CalendarRange,
  CheckCheck,
  Flame,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useHabits } from "../hooks/use-habits.ts";
import { computeStats } from "../lib/compute-stats.ts";
import { cn } from "../lib/utils.ts";
import { HabitStatCard } from "./habit-stat-card.tsx";

function SummaryStat({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: color
            ? `color-mix(in oklch, ${color} 18%, transparent)`
            : undefined,
          color: color ?? "var(--color-muted-foreground)",
        }}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="font-bold text-xl leading-none">{value}</div>
        <div className="mt-0.5 text-muted-foreground text-xs">{label}</div>
      </div>
    </div>
  );
}

export function StatsPage() {
  const { habits, completions } = useHabits();
  const [windowDays, setWindowDays] = useState(7);

const stats = useMemo(
    () => computeStats(habits, completions, windowDays),
    [habits, completions, windowDays],
  );

  const summaryStats = useMemo(() => {
    const totalCompletions =
      stats.goodHabits.reduce((s, h) => s + h.totalInWindow, 0) +
      stats.badHabits.reduce((s, h) => s + h.totalInWindow, 0);
    const bestStreak = Math.max(
      ...stats.goodHabits.map((h) => h.currentStreak),
      ...stats.badHabits.map((h) => h.currentStreak),
      0
    );

    return { totalCompletions, bestStreak };
  }, [stats]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Stats</h1>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-0.5 shadow-sm">
          <button
            className={cn(
              "flex cursor-pointer select-none items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95",
              windowDays === 7
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hoverable:hover:text-foreground"
            )}
            onClick={() => setWindowDays(7)}
          >
            <Calendar className="size-3.5" />
            7d
          </button>
          <button
            className={cn(
              "flex cursor-pointer select-none items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95",
              windowDays === 30
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hoverable:hover:text-foreground"
            )}
            onClick={() => setWindowDays(30)}
          >
            <CalendarRange className="size-3.5" />
            30d
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="mb-5 flex size-20 items-center justify-center rounded-[1.25rem] bg-muted">
            <BarChart3 className="size-10 text-muted-foreground" />
          </div>
          <h2 className="font-bold text-lg">No data yet</h2>
          <p className="mt-1.5 max-w-[20ch] text-muted-foreground text-sm">
            Start tracking habits from the Log tab, then come here to see your
            progress.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <SummaryStat
              color="var(--color-primary)"
              icon={CheckCheck}
              label="this period"
              value={summaryStats.totalCompletions}
            />
            <SummaryStat
              color="var(--color-accent)"
              icon={Flame}
              label="best streak"
              value={
                summaryStats.bestStreak > 0
                  ? `${summaryStats.bestStreak}d`
                  : "—"
              }
            />
          </div>

          {stats.goodHabits.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-bold text-muted-foreground text-sm">
                Good habits
              </h2>
              {stats.goodHabits.map((h) => (
                <HabitStatCard key={h.habitId} stats={h} />
              ))}
            </section>
          )}

          {stats.badHabits.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-bold text-muted-foreground text-sm">
                Bad habits
              </h2>
              {stats.badHabits.map((h) => (
                <HabitStatCard key={h.habitId} stats={h} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
