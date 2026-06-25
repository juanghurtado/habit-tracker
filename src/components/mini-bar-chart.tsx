import type { DailyCount } from "../lib/compute-stats"

interface MiniBarChartProps {
  data: DailyCount[]
  color: string
  maxCount?: number
}

export function MiniBarChart({ data, color, maxCount }: MiniBarChartProps) {
  const max = maxCount ?? Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex items-end gap-[3px]">
      {data.map((day) => {
        const height = Math.max((day.count / max) * 100, day.count > 0 ? 8 : 0)
        return (
          <div
            key={day.date}
            className="relative flex flex-1 items-end"
            style={{ height: 32 }}
          >
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${height}%`,
                backgroundColor: day.count > 0 ? color : "var(--color-muted)",
                opacity: day.count > 0 ? 1 : 0.4,
                minHeight: day.count > 0 ? 4 : 2,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}