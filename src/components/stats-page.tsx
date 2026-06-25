import { useState, useMemo } from "react"
import { CheckCheck, Flame, List, Calendar, CalendarRange, BarChart3 } from "lucide-react"
import { useHabits } from "../hooks/use-habits"
import { computeStats } from "../lib/compute-stats"
import { HabitStatCard } from "./habit-stat-card"
import { cn } from "../lib/utils"

function SummaryStat({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string | number
  label: string
  color?: string
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
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export function StatsPage() {
  const { habits, completions } = useHabits()
  const [windowDays, setWindowDays] = useState(7)

  const stats = computeStats(habits, completions, windowDays)

  const summaryStats = useMemo(() => {
    const totalCompletions = stats.goodHabits.reduce((s, h) => s + h.totalInWindow, 0) +
      stats.badHabits.reduce((s, h) => s + h.totalInWindow, 0)
    const bestStreak = Math.max(
      ...stats.goodHabits.map((h) => h.currentStreak),
      ...stats.badHabits.map((h) => h.currentStreak),
      0
    )
    const activeHabits = [...stats.goodHabits, ...stats.badHabits].filter(
      (h) => h.totalInWindow > 0
    ).length

    return { totalCompletions, bestStreak, activeHabits, totalHabits: habits.length }
  }, [stats, habits])

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stats</h1>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-0.5 shadow-sm">
          <button
            onClick={() => setWindowDays(7)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer select-none",
              windowDays === 7
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="size-3.5" />
            7d
          </button>
          <button
            onClick={() => setWindowDays(30)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer select-none",
              windowDays === 30
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
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
          <h2 className="text-lg font-bold">No data yet</h2>
          <p className="mt-1.5 max-w-[20ch] text-sm text-muted-foreground">
            Start tracking habits from the Log tab, then come here to see your progress.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <SummaryStat
              icon={CheckCheck}
              value={summaryStats.totalCompletions}
              label="this period"
              color="var(--color-primary)"
            />
            <SummaryStat
              icon={Flame}
              value={summaryStats.bestStreak > 0 ? `${summaryStats.bestStreak}d` : "—"}
              label="best streak"
              color="var(--color-accent)"
            />
            <SummaryStat
              icon={List}
              value={`${summaryStats.activeHabits}/${summaryStats.totalHabits}`}
              label="active"
            />
          </div>

          {stats.goodHabits.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground">Good habits</h2>
              {stats.goodHabits.map((h) => (
                <HabitStatCard key={h.habitId} stats={h} />
              ))}
            </section>
          )}

          {stats.badHabits.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground">Bad habits</h2>
              {stats.badHabits.map((h) => (
                <HabitStatCard key={h.habitId} stats={h} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}