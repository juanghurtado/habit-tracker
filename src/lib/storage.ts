import type { Habit, Completion } from "../types"
import { getRandomColor } from "./colors"
import { getRandomLabel } from "./button-labels"

const HABITS_KEY = "habit-tracker-habits"
const COMPLETIONS_KEY = "habit-tracker-completions"

function generateId(): string {
  return crypto.randomUUID?.() ?? `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY)
    const habits: Habit[] = raw ? JSON.parse(raw) : []
    return habits.map((h) => ({
      ...h,
      color: h.color ?? getRandomColor(h.type),
      buttonLabel: h.buttonLabel ?? getRandomLabel(h.type),
    }))
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
  type: "good" | "bad",
  color: string,
  buttonLabel: string
): Habit {
  return {
    id: generateId(),
    name,
    icon,
    type,
    color,
    buttonLabel,
    createdAt: new Date().toISOString(),
  }
}

export function createCompletion(habitId: string, date?: Date): Completion {
  const timestamp = date
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).toISOString()
    : new Date().toISOString()
  return {
    id: generateId(),
    habitId,
    timestamp,
  }
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function formatUTCDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getCompletionsForDate(
  completions: Completion[],
  date: Date
): Completion[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const startStr = start.toISOString()
  const endStr = end.toISOString()
  return completions.filter(
    (c) => c.timestamp >= startStr && c.timestamp < endStr
  )
}

export function getCompletionsForHabitOnDate(
  completions: Completion[],
  habitId: string,
  date: Date
): Completion[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const startStr = start.toISOString()
  const endStr = end.toISOString()
  return completions.filter(
    (c) => c.habitId === habitId && c.timestamp >= startStr && c.timestamp < endStr
  )
}