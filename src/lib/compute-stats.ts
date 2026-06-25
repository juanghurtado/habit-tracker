import type { Habit, Completion } from "../types"

export interface HabitStats {
  habitId: string
  totalCompletions: number
}

export interface StatsResult {
  grandTotal: number
  perHabit: HabitStats[]
}

export function computeStats(habits: Habit[], completions: Completion[]): StatsResult {
  const perHabit: HabitStats[] = habits.map((habit) => {
    const totalCompletions = completions.filter((c) => c.habitId === habit.id).length
    return { habitId: habit.id, totalCompletions }
  })

  const grandTotal = perHabit.reduce((sum, h) => sum + h.totalCompletions, 0)

  return { grandTotal, perHabit }
}