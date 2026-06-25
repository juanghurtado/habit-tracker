export type HabitType = "good" | "bad";

export interface Habit {
  buttonLabel: string;
  color: string;
  createdAt: string;
  icon: string;
  id: string;
  name: string;
  type: HabitType;
}

export interface Completion {
  habitId: string;
  id: string;
  timestamp: string;
}
