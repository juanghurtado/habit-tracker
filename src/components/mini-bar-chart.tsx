import { useMemo } from "react"
import type { DailyCount } from "../lib/compute-stats"
import { cn } from "../lib/utils"

interface MiniBarChartProps {
  data: DailyCount[]
  color: string
  maxCount?: number
}

export function MiniBarChart({ data, color, maxCount }: MiniBarChartProps) {
  const max = maxCount ?? Math.max(...data.map((d) => d.count), 1)

  const weekBoundaries = useMemo(() => {
    const boundaries: number[] = []
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].date + "T00:00:00")
      const curr = new Date(data[i].date + "T00:00:00")
      if (prev.getDay() === 6 && curr.getDay() === 0) {
        boundaries.push(i)
      }
    }
    return boundaries
  }, [data])

  return (
    <div
      className="flex items-end gap-[2px]"
      style={{ borderBottom: `1px solid color-mix(in oklch, ${color} 25%, transparent)` }}
    >
      {data.map((day, index) => {
        const height = Math.max((day.count / max) * 100, day.count > 0 ? 8 : 0)
        return (
          <div
            key={day.date}
            className={cn(
              "relative flex flex-1 items-end transition-all duration-300",
              weekBoundaries.includes(index) && "ml-[3px]"
            )}
            style={{ height: 36 }}
          >
            <div
              className="w-full rounded-t-[3px] transition-all duration-300"
              style={{
                height: `${height}%`,
                backgroundColor: day.count > 0 ? color : undefined,
                opacity: day.count > 0 ? 0.85 : undefined,
                minHeight: day.count > 0 ? 4 : undefined,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}