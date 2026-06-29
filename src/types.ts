export type HabitType = "good" | "bad";

export interface Habit {
  buttonLabel: string;
  color: string;
  createdAt: string;
  deletedAt: string | null;
  icon: string;
  id: string;
  name: string;
  syncedAt: string | null;
  type: HabitType;
  updatedAt: string;
}

export interface Completion {
  deletedAt: string | null;
  habitId: string;
  id: string;
  syncedAt: string | null;
  timestamp: string;
}
