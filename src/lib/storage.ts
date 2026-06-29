import type { Completion, Habit } from "../types.ts";
import { getRandomLabel } from "./button-labels.ts";
import { getRandomColor } from "./colors.ts";

const HABITS_KEY = "habit-tracker-habits";
const COMPLETIONS_KEY = "habit-tracker-completions";

function generateId(): string {
  return (
    crypto.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      // biome-ignore lint/suspicious/noBitwiseOperators: needed for legacy UUID generation
      const r = (Math.random() * 16) | 0;
      // biome-ignore lint/suspicious/noBitwiseOperators: needed for legacy UUID generation
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    })
  );
}

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    const habits: Habit[] = raw ? JSON.parse(raw) : [];
    const needsColorMigration = habits.some((h) => !(h.color && h.buttonLabel));
    const needsSyncMigration = habits.some(
      (h) =>
        h.syncedAt === undefined ||
        h.updatedAt === undefined ||
        h.deletedAt === undefined
    );
    if (needsColorMigration || needsSyncMigration) {
      const now = new Date().toISOString();
      const migrated = habits.map((h) => ({
        ...h,
        color: h.color ?? getRandomColor(h.type),
        buttonLabel: h.buttonLabel ?? getRandomLabel(h.type),
        syncedAt: h.syncedAt ?? null,
        updatedAt: h.updatedAt ?? now,
        deletedAt: h.deletedAt ?? null,
      }));
      try {
        saveHabits(migrated);
      } catch {
        console.warn("Failed to persist migrated habit data");
      }
      return migrated;
    }
    return habits;
  } catch {
    return [];
  }
}

export function saveHabits(habits: Habit[]): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function loadCompletions(): Completion[] {
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    const completions: Completion[] = raw ? JSON.parse(raw) : [];
    if (
      completions.some(
        (c) => c.syncedAt === undefined || c.deletedAt === undefined
      )
    ) {
      const migrated = completions.map((c) => ({
        ...c,
        syncedAt: c.syncedAt ?? null,
        deletedAt: c.deletedAt ?? null,
      }));
      try {
        saveCompletions(migrated);
      } catch {
        console.warn("Failed to persist migrated completion data");
      }
      return migrated;
    }
    return completions;
  } catch {
    return [];
  }
}

export function saveCompletions(completions: Completion[]): void {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
}

export function createHabit(
  name: string,
  icon: string,
  type: "good" | "bad",
  color: string,
  buttonLabel: string
): Habit {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    icon,
    type,
    color,
    buttonLabel,
    createdAt: now,
    syncedAt: null,
    updatedAt: now,
    deletedAt: null,
  };
}

export function createCompletion(habitId: string, date?: Date): Completion {
  const timestamp = date
    ? new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12
      ).toISOString()
    : new Date().toISOString();
  return {
    id: generateId(),
    habitId,
    timestamp,
    syncedAt: null,
    deletedAt: null,
  };
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCompletionsForDate(
  completions: Completion[],
  date: Date
): Completion[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const startStr = start.toISOString();
  const endStr = end.toISOString();
  return completions.filter(
    (c) => c.timestamp >= startStr && c.timestamp < endStr
  );
}

export function getCompletionsForHabitOnDate(
  completions: Completion[],
  habitId: string,
  date: Date
): Completion[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const startStr = start.toISOString();
  const endStr = end.toISOString();
  return completions.filter(
    (c) =>
      c.habitId === habitId && c.timestamp >= startStr && c.timestamp < endStr
  );
}
