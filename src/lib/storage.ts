import type { Habit, Completion } from "../types"

const HABITS_KEY = "habit-tracker-habits"
const COMPLETIONS_KEY = "habit-tracker-completions"

function generateId(): string {
  return crypto.randomUUID()
}

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveHabits(habits: Habit[]): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits))
}

export function loadCompletions(): Completion[] {
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCompletions(completions: Completion[]): void {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions))
}

export function createHabit(
  name: string,
  icon: string,
  type: "good" | "bad"
): Habit {
  return {
    id: generateId(),
    name,
    icon,
    type,
    createdAt: new Date().toISOString(),
  }
}

export function createCompletion(habitId: string): Completion {
  return {
    id: generateId(),
    habitId,
    timestamp: new Date().toISOString(),
  }
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getCompletionsForDate(
  completions: Completion[],
  date: Date
): Completion[] {
  const key = formatDateKey(date)
  return completions.filter((c) => c.timestamp.startsWith(key))
}

export function getCompletionsForHabitOnDate(
  completions: Completion[],
  habitId: string,
  date: Date
): Completion[] {
  const key = formatDateKey(date)
  return completions.filter(
    (c) => c.habitId === habitId && c.timestamp.startsWith(key)
  )
}