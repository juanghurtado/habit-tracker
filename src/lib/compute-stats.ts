import type { Habit, Completion } from "../types"

export interface DailyCount {
  date: string
  count: number
}

export interface HabitStats {
  habitId: string
  habitName: string
  habitIcon: string
  habitColor: string
  habitType: "good" | "bad"
  totalInWindow: number
  completionRate: number
  averagePerDay: number
  lifetimeTotal: number
  isRegressing: boolean
  dailyData: DailyCount[]
}

export interface StatsResult {
  grandTotal: number
  goodHabits: HabitStats[]
  badHabits: HabitStats[]
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

function countCompletionsOnDate(completions: Completion[], habitId: string, date: Date): number {
  const key = formatDateKey(date)
  return completions.filter((c) => c.habitId === habitId && c.timestamp.startsWith(key)).length
}

export function computeStats(habits: Habit[], completions: Completion[], windowDays: number): StatsResult {
  const today = new Date()
  const todayStart = startOfDay(today)

  const windowStart = new Date(todayStart)
  windowStart.setDate(windowStart.getDate() - windowDays + 1)

  const priorWindowStart = new Date(todayStart)
  priorWindowStart.setDate(priorWindowStart.getDate() - windowDays * 2 + 1)

  const priorWindowEnd = new Date(todayStart)
  priorWindowEnd.setDate(priorWindowEnd.getDate() - windowDays)

  const daysInWindow = getDaysInRange(windowStart, todayStart)
  const daysInPriorWindow = getDaysInRange(priorWindowStart, priorWindowEnd)

  let grandTotal = 0

  const allHabitStats: HabitStats[] = habits.map((habit) => {
    const lifetimeTotal = completions.filter((c) => c.habitId === habit.id).length
    grandTotal += lifetimeTotal

    const dailyData: DailyCount[] = daysInWindow.map((d) => ({
      date: formatDateKey(d),
      count: countCompletionsOnDate(completions, habit.id, d),
    }))

    const totalInWindow = dailyData.reduce((sum, d) => sum + d.count, 0)
    const completionRate = windowDays > 0 ? (totalInWindow / windowDays) * 100 : 0
    const averagePerDay = windowDays > 0 ? totalInWindow / windowDays : 0

    const priorTotal = daysInPriorWindow.reduce(
      (sum, d) => sum + countCompletionsOnDate(completions, habit.id, d),
      0
    )
    const priorRate = windowDays > 0 ? (priorTotal / windowDays) * 100 : 0
    const isRegressing = priorRate > 0 && completionRate < priorRate

    return {
      habitId: habit.id,
      habitName: habit.name,
      habitIcon: habit.icon,
      habitColor: habit.color,
      habitType: habit.type,
      totalInWindow,
      completionRate: Math.round(completionRate * 10) / 10,
      averagePerDay: Math.round(averagePerDay * 100) / 100,
      lifetimeTotal,
      isRegressing,
      dailyData,
    }
  })

  const goodHabits = allHabitStats.filter((h) => h.habitType === "good")
  const badHabits = allHabitStats.filter((h) => h.habitType === "bad")

  return { grandTotal, goodHabits, badHabits }
}