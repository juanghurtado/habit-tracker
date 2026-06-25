import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react"
import { getIcon } from "../lib/icons"
import type { HabitStats } from "../lib/compute-stats"
import { MiniBarChart } from "./mini-bar-chart"

interface HabitStatCardProps {
  stats: HabitStats
}

export function HabitStatCard({ stats }: HabitStatCardProps) {
  const Icon = getIcon(stats.habitIcon)

  const TrendIcon = stats.trend === "improving" ? TrendingUp : stats.trend === "declining" ? TrendingDown : Minus
  const trendBadgeClass = stats.trend === "improving"
    ? "bg-primary/10 text-primary"
    : stats.trend === "declining"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground"
  const trendLabel = stats.trend === "improving" ? "Improving" : stats.trend === "declining" ? "Declining" : "Stable"

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card p-4"
      style={{ borderColor: `color-mix(in oklch, ${stats.habitColor} 30%, transparent)` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `color-mix(in oklch, ${stats.habitColor} 8%, transparent)` }}
      />
      <div className="relative z-0 space-y-4">
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
            <h3 className="font-bold">{stats.habitName}</h3>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${trendBadgeClass}`}>
            <TrendIcon className="size-3" />
            {stats.percentageChange !== 0 && Math.abs(stats.percentageChange) !== 100
              ? `${stats.percentageChange > 0 ? "+" : ""}${stats.percentageChange}%`
              : trendLabel}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: `color-mix(in oklch, ${stats.habitColor} 12%, transparent)` }}>
            <div className="text-lg font-bold leading-none">{stats.totalInWindow}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Done</div>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: `color-mix(in oklch, ${stats.habitColor} 12%, transparent)` }}>
            <div className="text-lg font-bold leading-none">{stats.completionRate}%</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Rate</div>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: `color-mix(in oklch, ${stats.habitColor} 12%, transparent)` }}>
            <div className="text-lg font-bold leading-none">{stats.averagePerDay}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Avg/day</div>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: `color-mix(in oklch, ${stats.habitColor} 12%, transparent)` }}>
            <div className="inline-flex items-center justify-center gap-0.5 text-lg font-bold leading-none">
              <Zap className="size-3.5" style={{ color: stats.habitColor }} />
              {stats.currentStreak}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Streak</div>
          </div>
        </div>

        <MiniBarChart data={stats.dailyData} color={stats.habitColor} />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Lifetime: <span className="font-semibold text-foreground">{stats.lifetimeTotal}</span>
          </span>
          <span className="text-muted-foreground">
            Best streak: <span className="font-semibold text-foreground">{stats.longestStreak} days</span>
          </span>
        </div>
      </div>
    </div>
  )
}