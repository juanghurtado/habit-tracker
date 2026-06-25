import { TrendingDown } from "lucide-react"
import { getIcon } from "../lib/icons"
import type { HabitStats } from "../lib/compute-stats"
import { MiniBarChart } from "./mini-bar-chart"

interface HabitStatCardProps {
  stats: HabitStats
}

export function HabitStatCard({ stats }: HabitStatCardProps) {
  const Icon = getIcon(stats.habitIcon)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `color-mix(in oklch, ${stats.habitColor} 8%, transparent)` }}
      />
      <div className="relative z-0 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `color-mix(in oklch, ${stats.habitColor} 20%, transparent)`,
              color: stats.habitColor,
            }}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{stats.habitName}</h3>
              {stats.isRegressing && (
                <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  <TrendingDown className="size-3" />
                  Regressing
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <div className="text-lg font-bold">{stats.totalInWindow}</div>
            <div className="text-xs text-muted-foreground">Done</div>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <div className="text-lg font-bold">{stats.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Rate</div>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <div className="text-lg font-bold">{stats.averagePerDay}</div>
            <div className="text-xs text-muted-foreground">Avg/day</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Lifetime: <span className="font-semibold text-foreground">{stats.lifetimeTotal}</span>
          </div>
        </div>

        <MiniBarChart data={stats.dailyData} color={stats.habitColor} />
      </div>
    </div>
  )
}