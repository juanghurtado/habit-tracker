export type HabitType = "good" | "bad"

export interface Habit {
  id: string
  name: string
  icon: string
  type: HabitType
  createdAt: string
}

export interface Completion {
  id: string
  habitId: string
  timestamp: string
}