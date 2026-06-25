import { Zap } from "lucide-react";
import type { HabitStats } from "../lib/compute-stats.ts";
import { getIcon } from "../lib/icons.ts";
import { MiniBarChart } from "./mini-bar-chart.tsx";

interface HabitStatCardProps {
  stats: HabitStats;
}

export function HabitStatCard({ stats }: HabitStatCardProps) {
  const Icon = getIcon(stats.habitIcon);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card p-4"
      style={{
        borderColor: `color-mix(in oklch, ${stats.habitColor} 30%, transparent)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: `color-mix(in oklch, ${stats.habitColor} 8%, transparent)`,
        }}
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
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div
            className="rounded-xl p-2.5 text-center"
            style={{
              backgroundColor: `color-mix(in oklch, ${stats.habitColor} 12%, transparent)`,
            }}
          >
            <div className="font-bold text-lg leading-none">
              {stats.totalInWindow}
            </div>
            <div className="mt-0.5 text-muted-foreground text-xs">Done</div>
          </div>
          <div
            className="rounded-xl p-2.5 text-center"
            style={{
              backgroundColor: `color-mix(in oklch, ${stats.habitColor} 12%, transparent)`,
            }}
          >
            <div className="font-bold text-lg leading-none">
              {stats.averagePerDay}
            </div>
            <div className="mt-0.5 text-muted-foreground text-xs">Avg/day</div>
          </div>
          <div
            className="rounded-xl p-2.5 text-center"
            style={{
              backgroundColor: `color-mix(in oklch, ${stats.habitColor} 12%, transparent)`,
            }}
          >
            <div className="inline-flex items-center justify-center gap-0.5 font-bold text-lg leading-none">
              <Zap className="size-3.5" style={{ color: stats.habitColor }} />
              {stats.currentStreak}
            </div>
            <div className="mt-0.5 text-muted-foreground text-xs">Streak</div>
          </div>
        </div>

        <MiniBarChart color={stats.habitColor} data={stats.dailyData} />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Lifetime:{" "}
            <span className="font-semibold text-foreground">
              {stats.lifetimeTotal}
            </span>
          </span>
          <span className="text-muted-foreground">
            Best streak:{" "}
            <span className="font-semibold text-foreground">
              {stats.longestStreak} days
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
