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
  trend: "improving" | "declining" | "stable"
  percentageChange: number
  currentStreak: number
  longestStreak: number
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

function getCompletionDateSet(completions: Completion[], habitId: string): Set<string> {
  return new Set(
    completions
      .filter((c) => c.habitId === habitId)
      .map((c) => c.timestamp.slice(0, 10))
  )
}

function computeCurrentStreak(completions: Completion[], habitId: string, habitType: "good" | "bad", createdAt: string): number {
  const completionDates = getCompletionDateSet(completions, habitId)

  const earliestDate = createdAt
    ? new Date(Math.max(new Date(createdAt).getTime(), Date.now() - 365 * 86400000))
    : new Date(Date.now() - 365 * 86400000)

  let streak = 0
  const current = new Date()
  current.setHours(0, 0, 0, 0)

  const earliest = startOfDay(earliestDate)

  while (current >= earliest) {
    const key = formatDateKey(current)
    const hasCompletion = completionDates.has(key)

    if (habitType === "good" && hasCompletion) streak++
    else if (habitType === "bad" && !hasCompletion) streak++
    else break

    current.setDate(current.getDate() - 1)
  }

  return streak
}

function computeLongestStreak(completions: Completion[], habitId: string, habitType: "good" | "bad"): number {
  const completionDates = getCompletionDateSet(completions, habitId)

  const allDates = [...completionDates].sort()
  if (allDates.length === 0) return 0

  const firstDate = new Date(allDates[0])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxSpan = Math.min(366, Math.ceil((today.getTime() - firstDate.getTime()) / 86400000) + 1)
  if (maxSpan <= 0) return 0

  const current = new Date(firstDate)
  let longest = 0
  let currentRun = 0
  let daysChecked = 0

  while (current <= today && daysChecked < maxSpan) {
    const key = formatDateKey(current)
    const hasCompletion = completionDates.has(key)

    if (habitType === "good" && hasCompletion) currentRun++
    else if (habitType === "bad" && !hasCompletion) currentRun++
    else {
      longest = Math.max(longest, currentRun)
      currentRun = 0
    }

    current.setDate(current.getDate() + 1)
    daysChecked++
  }

  longest = Math.max(longest, currentRun)
  return longest
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

    const percentageChange = priorRate > 0
      ? Math.round(((completionRate - priorRate) / priorRate) * 100)
      : completionRate > 0 ? 100 : 0

    const trend = percentageChange > 5 ? "improving" : percentageChange < -5 ? "declining" : "stable"

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
      trend,
      percentageChange,
      currentStreak: computeCurrentStreak(completions, habit.id, habit.type, habit.createdAt),
      longestStreak: computeLongestStreak(completions, habit.id, habit.type),
      dailyData,
    }
  })

  const goodHabits = allHabitStats.filter((h) => h.habitType === "good")
  const badHabits = allHabitStats.filter((h) => h.habitType === "bad")

  return { grandTotal, goodHabits, badHabits }
}