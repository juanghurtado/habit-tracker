import { useState } from "react"
import { Trophy, Calendar, CalendarRange, Frown } from "lucide-react"
import { useHabits } from "../hooks/use-habits"
import { computeStats } from "../lib/compute-stats"
import { HabitStatCard } from "./habit-stat-card"
import { cn } from "../lib/utils"

export function StatsPage() {
  const { habits, completions } = useHabits()
  const [windowDays, setWindowDays] = useState(7)

  const stats = computeStats(habits, completions, windowDays)

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="size-6 text-primary" />
        </div>
        <span className="text-4xl font-bold">{stats.grandTotal}</span>
        <span className="text-sm text-muted-foreground">total completions</span>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
          <button
            onClick={() => setWindowDays(7)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer select-none",
              windowDays === 7
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="size-4" />
            7 days
          </button>
          <button
            onClick={() => setWindowDays(30)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer select-none",
              windowDays === 30
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarRange className="size-4" />
            30 days
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-10 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Frown className="size-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No habits yet — add one from the Log tab.</p>
        </div>
      ) : (
        <>
          {stats.goodHabits.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Good habits</h2>
              {stats.goodHabits.map((h) => (
                <HabitStatCard key={h.habitId} stats={h} />
              ))}
            </section>
          )}

          {stats.badHabits.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Bad habits</h2>
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