import { Trophy } from "lucide-react"
import { useHabits } from "../hooks/use-habits"
import { computeStats } from "../lib/compute-stats"

export function StatsPage() {
  const { habits, completions } = useHabits()
  const stats = computeStats(habits, completions)

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="size-6 text-primary" />
        </div>
        <span className="text-4xl font-bold">{stats.grandTotal}</span>
        <span className="text-sm text-muted-foreground">total completions</span>
      </div>
    </div>
  )
}