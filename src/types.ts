export type HabitType = "good" | "bad"

export interface Habit {
  id: string
  name: string
  icon: string
  type: HabitType
  color: string
  buttonLabel: string
  createdAt: string
}

export interface Completion {
  id: string
  habitId: string
  timestamp: string
}